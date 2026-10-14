-- Becoming an artist, celebrated; and codes for Flow+ artists every week.
--
-- - A guest book note when you become an artist ('became_artist', from whose
--   code let you in) and when artist codes arrive ('artist_codes', how many).
-- - The Artist Pass: an artist can post their pass once (posts.milestone),
--   numbered in the order artists joined. Only the server writes it (secret
--   key, after checking the account really is an artist): no column grant.
-- - Flow+ artists get one more code every Monday, until they hold 5 unused
--   (a cap, so codes get passed on instead of piling up).

-- Guest book --------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'welcome', 'like', 'comment', 'reply', 'mention', 'follow', 'repost', 'invite_joined',
  'commission_request', 'request_update',
  'became_artist', 'artist_codes'
));

-- Artists in the order they got artist access: No. 1 is the first.
create function private.artist_number(uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profiles p, public.profiles me
  where me.id = uid
    and p.artist_since is not null
    and (p.artist_since, p.id) <= (me.artist_since, me.id);
$$;

revoke all on function private.artist_number(uuid) from public, anon, authenticated;

create function private.notify_became_artist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, data)
  values (new.id, 'became_artist', new.invited_by, jsonb_build_object('number', private.artist_number(new.id)));
  return null;
end;
$$;

revoke all on function private.notify_became_artist() from public, anon, authenticated;

create trigger profiles_notify_became_artist
  after update of artist_since on public.profiles
  for each row
  when (old.artist_since is null and new.artist_since is not null)
  execute function private.notify_became_artist();

-- Every grant of codes says how many arrived (one note per grant, not per code).
create or replace function private.grant_invites(owner uuid, how_many int, why text)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  made int := 0;
begin
  if how_many not between 1 and 50 then
    raise exception 'Grant between 1 and 50 invites at a time';
  end if;
  while made < how_many loop
    candidate := private.random_invite_code();
    begin
      insert into public.invites (code, inviter_id, note) values (candidate, owner, why);
      made := made + 1;
      return next candidate;
    exception when unique_violation then
      -- Same code drawn twice: draw again.
    end;
  end loop;
  insert into public.notifications (recipient_id, kind, data)
  values (owner, 'artist_codes', jsonb_build_object('count', how_many, 'weekly', coalesce(why, '') like 'weekly%'));
end;
$$;

revoke all on function private.grant_invites(uuid, int, text) from public, anon, authenticated;

-- The Artist Pass post --------------------------------------------------------------

alter table public.posts
  add column milestone jsonb check (milestone is null or (jsonb_typeof(milestone) = 'object' and milestone ->> 'kind' = 'artist_pass'));

comment on column public.posts.milestone is 'A milestone the post celebrates, drawn by the app (the Artist Pass: {kind, number, since, invitedBy}). Written by the server only.';

-- One pass per artist.
create unique index posts_one_artist_pass_key on public.posts (author_id) where milestone ->> 'kind' = 'artist_pass';

-- Weekly codes for Flow+ artists ------------------------------------------------------

create function private.grant_weekly_codes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  artist record;
  granted int := 0;
begin
  for artist in
    select p.id
    from public.profiles p
    where p.plan = 'flow_plus'
      and p.artist_since is not null
      and (select count(*) from public.invites i where i.inviter_id = p.id and i.redeemed_at is null) < 5
  loop
    perform private.grant_invites(artist.id, 1, 'weekly: Flow+');
    granted := granted + 1;
  end loop;
  return granted;
end;
$$;

revoke all on function private.grant_weekly_codes() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- Mondays, 15:00 UTC (morning in the Americas, afternoon in Europe).
select cron.schedule('weekly-artist-codes', '0 15 * * 1', 'select private.grant_weekly_codes()');
