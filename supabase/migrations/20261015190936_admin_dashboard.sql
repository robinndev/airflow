-- The team's back office (/admin): who's on the team, a once-a-day mark for
-- every account that was here (daily active users), and one function that
-- sums the marketplace up for the dashboard.
--
-- Only mark_active() is callable from the browser. The dashboard checks the
-- viewer against team_members on the server, then reads with the secret key.
-- Days are UTC days.

-- The team ---------------------------------------------------------------------

create table public.team_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'moderator')),
  added_at timestamptz not null default now()
);

comment on table public.team_members is
  'Artiflow''s team: admins open /admin (moderators will review reports). Secret key only; `npm run team`.';

alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;

-- The first admins (decided 2026-10-15): Robin, Sabrina and Ipphie.
insert into public.team_members (user_id, role)
select id, 'admin' from public.profiles where handle in ('robindev', 'shinllz', 'ipphie')
on conflict do nothing;

-- Daily active accounts --------------------------------------------------------

-- One row per account per UTC day it opened Artiflow signed in. The browser
-- calls mark_active() at most once a day (src/components/site/activity-ping.tsx).
create table public.daily_activity (
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (day, user_id)
);

create index daily_activity_user_id_idx on public.daily_activity (user_id);

comment on table public.daily_activity is
  'Which accounts were here on which UTC day (daily active users on /admin). Never read from the browser.';

alter table public.daily_activity enable row level security;
revoke all on public.daily_activity from anon, authenticated;

create function public.mark_active()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.daily_activity (day, user_id)
  select (now() at time zone 'utc')::date, p.id
  from public.profiles p
  where p.id = (select auth.uid())
  on conflict do nothing;
$$;

revoke execute on function public.mark_active() from public, anon;
grant execute on function public.mark_active() to authenticated;

-- Before the mark existed: the days each account left a trace (signed in,
-- posted, liked, followed, saved, wrote, asked for or answered a commission,
-- listed something). Close enough to draw the curve from the first day.
insert into public.daily_activity (day, user_id)
select distinct (seen.seen_at at time zone 'utc')::date, seen.user_id
from (
  select created_at, id from public.profiles
  union all select created_at, author_id from public.posts
  union all select created_at, author_id from public.comments
  union all select created_at, user_id from public.post_likes
  union all select created_at, follower_id from public.follows
  union all select created_at, user_id from public.favorites
  union all select created_at, sender_id from public.messages
  union all select created_at, buyer_id from public.commission_requests
  union all select quoted_at, artist_id from public.commission_requests where quoted_at is not null
  union all select delivered_at, artist_id from public.commission_requests where delivered_at is not null
  union all select created_at, owner_id from public.artworks
  union all select created_at, owner_id from public.characters
  union all select created_at, owner_id from public.services
  union all select created_at, owner_id from public.adoptables
  union all select created_at, user_id from auth.sessions
  union all select refreshed_at at time zone 'utc', user_id from auth.sessions where refreshed_at is not null
  union all select last_sign_in_at, id from auth.users where last_sign_in_at is not null
) as seen (seen_at, user_id)
where seen.user_id is not null
  and exists (select 1 from public.profiles p where p.id = seen.user_id)
on conflict do nothing;

-- The dashboard ------------------------------------------------------------------

-- Everything /admin shows, in one call (src/lib/admin/server.ts). Totals and
-- funnels cover [p_from, p_to]; the daily series start at p_series_from, so
-- the app can compare with the period before. Money is USD as recorded
-- (quotes, adoptable prices); the fee, plan prices and the shop's catalog
-- live in the app, which turns these counts into revenue.
-- p_without_team leaves out the team's own accounts, and every order a team
-- member is on either side of.
create function public.admin_dashboard(p_from date, p_to date, p_series_from date, p_without_team boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team uuid[] := case when p_without_team then array(select user_id from public.team_members) else '{}'::uuid[] end;
  t0 timestamptz := p_from::timestamp at time zone 'utc';
  t1 timestamptz := (p_to + 1)::timestamp at time zone 'utc';
  s0 timestamptz := p_series_from::timestamp at time zone 'utc';
  series jsonb;
  totals jsonb;
begin
  if p_to < p_from or p_series_from > p_from or p_to - p_series_from > 1500 then
    raise exception 'Pick a range of up to four years' using errcode = '22023';
  end if;

  with days as (
    select d::date as day from generate_series(p_series_from::timestamp, p_to::timestamp, interval '1 day') as d
  ),
  s_signups as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.profiles
    where created_at >= s0 and created_at < t1 and id <> all (team) group by 1
  ),
  s_active as (
    select day, count(*) as n from public.daily_activity
    where day between p_series_from and p_to and user_id <> all (team) group by 1
  ),
  s_posts as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.posts
    where created_at >= s0 and created_at < t1 and author_id <> all (team) group by 1
  ),
  s_comments as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.comments
    where created_at >= s0 and created_at < t1 and author_id <> all (team) group by 1
  ),
  s_likes as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.post_likes
    where created_at >= s0 and created_at < t1 and user_id <> all (team) group by 1
  ),
  s_follows as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.follows
    where created_at >= s0 and created_at < t1 and follower_id <> all (team) group by 1
  ),
  s_saves as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.favorites
    where created_at >= s0 and created_at < t1 and user_id <> all (team) group by 1
  ),
  s_messages as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.messages
    where created_at >= s0 and created_at < t1 and sender_id <> all (team) group by 1
  ),
  -- Pieces added to a gallery by hand (a post's pictures count as the post).
  s_uploads as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.artworks
    where created_at >= s0 and created_at < t1 and post_id is null and owner_id <> all (team) group by 1
  ),
  s_requests as (
    select (created_at at time zone 'utc')::date as day, count(*) as n from public.commission_requests
    where created_at >= s0 and created_at < t1
      and buyer_id <> all (team) and coalesce(artist_id <> all (team), true)
    group by 1
  ),
  s_paid as (
    select (paid_at at time zone 'utc')::date as day, count(*) as n, sum(quote_usd) as usd from public.commission_requests
    where paid_at >= s0 and paid_at < t1 and status in ('paid', 'in_progress', 'delivered')
      and buyer_id <> all (team) and coalesce(artist_id <> all (team), true)
    group by 1
  ),
  s_adopted as (
    select (sold_at at time zone 'utc')::date as day, count(*) as n, sum(price_usd) as usd from public.adoptables
    where status = 'sold' and sold_at >= s0 and sold_at < t1 and owner_id <> all (team) group by 1
  ),
  s_subscribed as (
    select (plan_since at time zone 'utc')::date as day, count(*) as n from public.profiles
    where plan <> 'free' and plan_since >= s0 and plan_since < t1 and id <> all (team) group by 1
  )
  select jsonb_agg(jsonb_build_object(
    'day', d.day,
    'signups', coalesce(su.n, 0),
    'active', coalesce(ac.n, 0),
    'posts', coalesce(po.n, 0),
    'comments', coalesce(co.n, 0),
    'likes', coalesce(li.n, 0),
    'follows', coalesce(fo.n, 0),
    'saves', coalesce(sa.n, 0),
    'messages', coalesce(me.n, 0),
    'uploads', coalesce(up.n, 0),
    'requests', coalesce(rq.n, 0),
    'paid_orders', coalesce(pa.n, 0),
    'paid_usd', coalesce(pa.usd, 0),
    'adoptions', coalesce(ad.n, 0),
    'adoption_usd', coalesce(ad.usd, 0),
    'subscribed', coalesce(sb.n, 0)
  ) order by d.day)
  into series
  from days d
  left join s_signups su on su.day = d.day
  left join s_active ac on ac.day = d.day
  left join s_posts po on po.day = d.day
  left join s_comments co on co.day = d.day
  left join s_likes li on li.day = d.day
  left join s_follows fo on fo.day = d.day
  left join s_saves sa on sa.day = d.day
  left join s_messages me on me.day = d.day
  left join s_uploads up on up.day = d.day
  left join s_requests rq on rq.day = d.day
  left join s_paid pa on pa.day = d.day
  left join s_adopted ad on ad.day = d.day
  left join s_subscribed sb on sb.day = d.day;

  select jsonb_build_object(
    'accounts', (
      select jsonb_build_object(
        'total', count(*),
        'before', count(*) filter (where created_at < s0),
        'artists', count(*) filter (where artist_since is not null),
        'new_artists', count(*) filter (where artist_since >= t0 and artist_since < t1),
        'verified', count(*) filter (where verified_at is not null),
        'subscribers', count(*) filter (where plan <> 'free'),
        -- Days of paid plan inside the range, summed over today's subscribers.
        'subscriber_days', coalesce(sum(
          extract(epoch from greatest(interval '0', least(t1, now()) - greatest(t0, plan_since))) / 86400
        ) filter (where plan <> 'free'), 0)
      )
      from public.profiles where id <> all (team)
    ),
    -- Sign-ups that haven't finished: email not confirmed, or a social sign-in with no handle yet.
    'unfinished', (
      select jsonb_build_object(
        'unconfirmed', count(*) filter (where u.email_confirmed_at is null),
        'no_handle', count(*) filter (where p.id is null)
      )
      from auth.users u
      left join public.profiles p on p.id = u.id
      where u.id <> all (team) and not coalesce(u.is_anonymous, false)
    ),
    'active', jsonb_build_object(
      'today', (select count(*) from public.daily_activity where day = p_to and user_id <> all (team)),
      'week', (select count(distinct user_id) from public.daily_activity where day > p_to - 7 and day <= p_to and user_id <> all (team)),
      'month', (select count(distinct user_id) from public.daily_activity where day > p_to - 30 and day <= p_to and user_id <> all (team)),
      'range', (select count(distinct user_id) from public.daily_activity where day between p_from and p_to and user_id <> all (team))
    ),
    -- Requests sent in the range and how far each one got (ever).
    'requests', (
      select jsonb_build_object(
        'sent', count(*) filter (where artist_id is not null),
        'to_demo', count(*) filter (where artist_id is null),
        'quoted', count(*) filter (where quoted_at is not null),
        'paid', count(*) filter (where paid_at is not null),
        'started', count(*) filter (where started_at is not null),
        'delivered', count(*) filter (where delivered_at is not null),
        'waiting', count(*) filter (where artist_id is not null and status in ('pending', 'waitlisted')),
        'declined', count(*) filter (where status = 'declined'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'expired', count(*) filter (where status = 'expired'),
        'hours_to_quote', percentile_cont(0.5) within group (order by extract(epoch from quoted_at - created_at) / 3600)
          filter (where quoted_at is not null),
        'days_to_deliver', percentile_cont(0.5) within group (order by extract(epoch from delivered_at - paid_at) / 86400)
          filter (where delivered_at is not null and paid_at is not null)
      )
      from public.commission_requests
      where created_at >= t0 and created_at < t1
        and buyer_id <> all (team) and coalesce(artist_id <> all (team), true)
    ),
    -- Orders right now, whatever the range.
    'pipeline', (
      select jsonb_build_object(
        'awaiting_payment', count(*) filter (where status = 'quoted' and quote_expires_at > now()),
        'awaiting_payment_usd', coalesce(sum(quote_usd) filter (where status = 'quoted' and quote_expires_at > now()), 0),
        'in_the_works', count(*) filter (where status in ('paid', 'in_progress')),
        'in_the_works_usd', coalesce(sum(quote_usd) filter (where status in ('paid', 'in_progress')), 0),
        'waiting_on_artist', count(*) filter (where artist_id is not null and status in ('pending', 'waitlisted'))
      )
      from public.commission_requests
      where buyer_id <> all (team) and coalesce(artist_id <> all (team), true)
    ),
    'top_artists', (
      select coalesce(jsonb_agg(jsonb_build_object('handle', t.handle, 'name', t.name, 'orders', t.orders, 'usd', t.usd)
        order by t.usd desc, t.orders desc), '[]'::jsonb)
      from (
        select p.handle, p.display_name as name, count(*) as orders, sum(r.quote_usd) as usd
        from public.commission_requests r
        join public.profiles p on p.id = r.artist_id
        where r.paid_at >= t0 and r.paid_at < t1 and r.status in ('paid', 'in_progress', 'delivered')
          and r.buyer_id <> all (team) and r.artist_id <> all (team)
        group by p.handle, p.display_name
        order by usd desc, orders desc
        limit 6
      ) t
    ),
    -- What's on offer right now.
    'listings', jsonb_build_object(
      'services_open', (select count(*) from public.services where status = 'open' and owner_id <> all (team)),
      'services_waitlist', (select count(*) from public.services where status = 'waitlist' and owner_id <> all (team)),
      'services_closed', (select count(*) from public.services where status = 'closed' and owner_id <> all (team)),
      'studios_open', (select count(distinct owner_id) from public.services where status <> 'closed' and owner_id <> all (team)),
      'adoptables_available', (select count(*) from public.adoptables where status = 'available' and owner_id <> all (team)),
      'adoptables_reserved', (select count(*) from public.adoptables where status = 'reserved' and owner_id <> all (team)),
      'adoptables_listed', (
        select count(*) from public.adoptables where created_at >= t0 and created_at < t1 and owner_id <> all (team)
      )
    ),
    'shelves', jsonb_build_object(
      'posts', (select count(*) from public.posts where author_id <> all (team)),
      'pieces', (select count(*) from public.artworks where owner_id <> all (team)),
      'characters', (select count(*) from public.characters where owner_id <> all (team)),
      'conversations', (select count(*) from public.conversations where started_by <> all (team))
    ),
    -- Shop items taken in the range, by how (claimed free, bought, a Flow+ monthly pick, a gift).
    'shop', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', x.kind, 'item', x.item_id, 'source', x.source, 'n', x.n)), '[]'::jsonb)
      from (
        select kind, item_id, source, count(*) as n from public.owned_items
        where acquired_at >= t0 and acquired_at < t1 and user_id <> all (team)
        group by kind, item_id, source
      ) x
    ),
    'shop_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', x.day, 'kind', x.kind, 'item', x.item_id, 'n', x.n)), '[]'::jsonb)
      from (
        select (acquired_at at time zone 'utc')::date as day, kind, item_id, count(*) as n from public.owned_items
        where source = 'purchase' and acquired_at >= s0 and acquired_at < t1 and user_id <> all (team)
        group by 1, 2, 3
      ) x
    ),
    'team', (
      select coalesce(jsonb_agg(jsonb_build_object('handle', p.handle, 'name', p.display_name, 'role', t.role)
        order by t.added_at, p.handle), '[]'::jsonb)
      from public.team_members t
      join public.profiles p on p.id = t.user_id
    )
  )
  into totals;

  return totals || jsonb_build_object('series', coalesce(series, '[]'::jsonb), 'generated_at', now());
end;
$$;

revoke all on function public.admin_dashboard(date, date, date, boolean) from public, anon, authenticated;
grant execute on function public.admin_dashboard(date, date, date, boolean) to service_role;
