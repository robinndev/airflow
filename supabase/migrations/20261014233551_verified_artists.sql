-- Verified artists: codes are earned (decided by the project lead and the
-- founding artists, 2026-10-14).
--
-- - An artist code lets you sell, but not invite: using one no longer gives
--   you codes.
-- - Reaching the goals (10 followers and US$100 in sales on Artiflow) makes
--   you a **verified artist** (`profiles.verified_at`) and gives you 2 codes
--   to let 2 more artists in, once.
-- - More codes come only with Flow+ (the weekly one), for verified artists.
--
-- Sales are commission orders the buyer paid for (paid, in progress,
-- delivered), at their quoted price. Adoptables count once checkout marks
-- them sold for real (today an artist can mark one sold by hand). The goals
-- are checked when something that moves them happens: a new follower, an
-- order paid or moving on, becoming an artist. Verification stays once
-- earned; the team can give or take it by hand (`npm run invites -- verify`).

alter table public.profiles add column verified_at timestamptz;

comment on column public.profiles.verified_at is 'When the artist reached the goals (10 followers, US$100 in sales) or the team verified them. Null: not verified.';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'welcome', 'like', 'comment', 'reply', 'mention', 'follow', 'repost', 'invite_joined',
  'commission_request', 'request_update',
  'became_artist', 'artist_codes', 'verified'
));

-- The goals, in one place (mirrored by VERIFY_GOALS in src/lib/artists/codes.ts).
create function private.verify_goals()
returns table (followers int, sales_usd numeric)
language sql
immutable
set search_path = ''
as $$
  select 10, 100.00::numeric;
$$;

-- Where an artist stands: followers and paid sales.
create function public.artist_progress(uid uuid)
returns table (followers int, sales_usd numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.follows f where f.followee_id = uid),
    (select coalesce(sum(r.quote_usd), 0) from public.commission_requests r
      where r.artist_id = uid and r.status in ('paid', 'in_progress', 'delivered'));
$$;

revoke all on function public.artist_progress(uuid) from public, anon;
-- Only your own progress (the server passes the viewer's id); totals only.
grant execute on function public.artist_progress(uuid) to service_role;

create function private.check_verification(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  have record;
  need record;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and artist_since is not null and verified_at is null) then
    return;
  end if;
  select * into have from public.artist_progress(uid);
  select * into need from private.verify_goals();
  if have.followers < need.followers or have.sales_usd < need.sales_usd then
    return;
  end if;

  update public.profiles set verified_at = now() where id = uid;
  insert into public.notifications (recipient_id, kind, data)
  values (uid, 'verified', jsonb_build_object('followers', have.followers, 'sales_usd', have.sales_usd, 'codes', 2));
  perform private.grant_invites(uid, 2, 'verified: met the goals');
end;
$$;

revoke all on function private.check_verification(uuid) from public, anon, authenticated;

create function private.verify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_verification(new.followee_id);
  return null;
end;
$$;

create function private.verify_on_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_verification(new.artist_id);
  return null;
end;
$$;

create function private.verify_on_artist_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_verification(new.id);
  return null;
end;
$$;

revoke all on function private.verify_on_follow() from public, anon, authenticated;
revoke all on function private.verify_on_sale() from public, anon, authenticated;
revoke all on function private.verify_on_artist_access() from public, anon, authenticated;

create trigger follows_check_verification
  after insert on public.follows
  for each row
  when (new.followee_id is not null)
  execute function private.verify_on_follow();

create trigger commission_requests_check_verification
  after update of status on public.commission_requests
  for each row
  when (new.status in ('paid', 'in_progress', 'delivered') and new.status is distinct from old.status)
  execute function private.verify_on_sale();

create trigger profiles_check_verification
  after update of artist_since on public.profiles
  for each row
  when (old.artist_since is null and new.artist_since is not null)
  execute function private.verify_on_artist_access();

-- Using a code gives artist access only (no codes). Same as before, minus the grant.
create or replace function private.create_profile(uid uuid, wanted text, display text, typed_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter uuid;
begin
  insert into public.profiles (id, handle, display_name, invite_code)
  values (uid, wanted, coalesce(nullif(trim(display), ''), wanted), upper(typed_code));

  if typed_code is not null then
    update public.invites i
    set redeemed_by = uid, redeemed_at = now()
    where i.canonical = upper(regexp_replace(typed_code, '[^A-Za-z0-9]', '', 'g'))
      and i.redeemed_at is null
      and i.inviter_id <> uid
    returning i.inviter_id into inviter;

    if inviter is not null then
      update public.profiles set invited_by = inviter, artist_since = now() where id = uid;
    end if;
  end if;
end;
$$;

create or replace function public.redeem_artist_code(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  wanted text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  invite public.invites%rowtype;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid) then
    return 'no_profile';
  end if;
  if exists (select 1 from public.profiles where id = uid and artist_since is not null) then
    return 'already';
  end if;
  if (select count(*) from private.artist_code_attempts where user_id = uid and tried_at > now() - interval '1 hour') >= 10 then
    return 'paused';
  end if;

  select * into invite from public.invites i where i.canonical = wanted for update;
  if not found then
    insert into private.artist_code_attempts (user_id) values (uid);
    return 'unknown';
  end if;
  if invite.inviter_id = uid then
    return 'own';
  end if;
  if invite.redeemed_at is not null then
    insert into private.artist_code_attempts (user_id) values (uid);
    return 'used';
  end if;

  update public.invites set redeemed_by = uid, redeemed_at = now() where canonical = wanted;
  -- invited_by tells the inviter (profiles_notify_inviter).
  update public.profiles set artist_since = now(), invited_by = coalesce(invited_by, invite.inviter_id) where id = uid;
  delete from private.artist_code_attempts where user_id = uid;
  return 'ok';
end;
$$;

revoke all on function public.redeem_artist_code(text) from public, anon;
grant execute on function public.redeem_artist_code(text) to authenticated;

-- A verification's own note says the codes came; don't add a second one.
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
  if coalesce(why, '') not like 'verified%' then
    insert into public.notifications (recipient_id, kind, data)
    values (owner, 'artist_codes', jsonb_build_object('count', how_many, 'weekly', coalesce(why, '') like 'weekly%'));
  end if;
end;
$$;

revoke all on function private.grant_invites(uuid, int, text) from public, anon, authenticated;

-- More codes only with Flow+, for verified artists.
create or replace function private.grant_weekly_codes()
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
      and p.verified_at is not null
      and (select count(*) from public.invites i where i.inviter_id = p.id and i.redeemed_at is null) < 5
  loop
    perform private.grant_invites(artist.id, 1, 'weekly: Flow+');
    granted := granted + 1;
  end loop;
  return granted;
end;
$$;

revoke all on function private.grant_weekly_codes() from public, anon, authenticated;

-- For the team's script: verify or unverify by hand (`npm run invites -- verify @handle`).
create function public.set_verified(handle text, verified boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  since timestamptz;
begin
  select p.id into uid from public.profiles p where p.handle = lower(set_verified.handle);
  if uid is null then
    raise exception 'No account with the handle @%', handle;
  end if;
  if not verified then
    update public.profiles set verified_at = null where id = uid;
    return null;
  end if;
  update public.profiles set verified_at = coalesce(verified_at, now()) where id = uid and artist_since is not null returning verified_at into since;
  if since is null then
    raise exception '@% needs artist access first', handle;
  end if;
  return since;
end;
$$;

revoke all on function public.set_verified(text, boolean) from public, anon, authenticated;
grant execute on function public.set_verified(text, boolean) to service_role;

-- Codes given by the old rule (2 for using a code) to artists who aren't
-- verified go back, with the note that announced them. They come back with
-- verification.
with dropped as (
  delete from public.invites i
  using public.profiles p
  where p.id = i.inviter_id
    and i.note like 'passed on:%'
    and i.redeemed_at is null
    and p.verified_at is null
  returning i.inviter_id
)
delete from public.notifications n
where n.kind = 'artist_codes'
  and coalesce(n.data ->> 'weekly', 'false') = 'false'
  and n.data ->> 'count' = '2'
  and n.recipient_id in (select inviter_id from dropped);

-- Anyone who already meets the goals is verified now.
select private.check_verification(p.id) from public.profiles p where p.artist_since is not null;
