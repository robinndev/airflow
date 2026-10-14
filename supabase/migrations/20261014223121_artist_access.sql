-- Artist access: anyone can join, browse, collect and commission; selling
-- (commission services, adoptables) takes an artist code.
--
-- Codes are the single-use invites the team grants (`npm run invites`). An
-- account becomes an artist when it uses one, at sign-up (create_profile) or
-- later from the site (redeem_artist_code). `profiles.artist_since` marks it;
-- `invited_by` remembers whose code it was, so the artist who shared it
-- stays answerable for it (as on VGen). Whoever the team grants codes to is
-- an artist too (a founding artist: no inviter).
--
-- Only the functions below set `artist_since`; users have no grant on it.

alter table public.profiles add column artist_since timestamptz;

comment on column public.profiles.artist_since is 'When the account got artist access (an artist code, or the team). Null: a collector, who can browse and commission but not sell.';

-- Who already sells or already used a code keeps selling.
update public.profiles p
set artist_since = p.created_at
where p.invited_by is not null
  or exists (select 1 from public.services s where s.owner_id = p.id)
  or exists (select 1 from public.adoptables a where a.owner_id = p.id)
  or exists (select 1 from public.invites i where i.inviter_id = p.id);

-- Selling takes artist access. Restrictive: on top of "your own rows only".
create policy "Only artists list services"
  on public.services
  as restrictive
  for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.artist_since is not null));

create policy "Only artists list adoptables"
  on public.adoptables
  as restrictive
  for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.artist_since is not null));

-- Joining with a code makes you an artist on the spot.
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

-- Using a code later, from the site. Ten wrong tries an hour, then a pause:
-- codes are 8 characters from 32, but nobody should get to guess at leisure.
create table private.artist_code_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  tried_at timestamptz not null default now()
);

create index artist_code_attempts_user_id_tried_at_idx on private.artist_code_attempts (user_id, tried_at desc);

-- 'ok' (you're an artist now), 'already' (you were), 'unknown', 'used',
-- 'own' (a code of your own), 'paused' (too many wrong tries), 'no_profile'.
create function public.redeem_artist_code(code text)
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

-- The team's grants make their holder a (founding) artist.
create or replace function public.grant_invites(handle text, how_many int, why text default null)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select p.id into owner from public.profiles p where p.handle = lower(grant_invites.handle);
  if owner is null then
    raise exception 'No artist with the handle @%', handle;
  end if;
  update public.profiles set artist_since = coalesce(artist_since, now()) where id = owner;
  return query select private.grant_invites(owner, how_many, why);
end;
$$;

revoke all on function public.grant_invites(text, int, text) from public, anon, authenticated;
grant execute on function public.grant_invites(text, int, text) to service_role;

-- For the team's script: give or take artist access by hand (`npm run invites -- artist @handle`).
create function public.set_artist_access(handle text, artist boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz;
begin
  update public.profiles p
  set artist_since = case when artist then coalesce(p.artist_since, now()) end
  where p.handle = lower(set_artist_access.handle)
  returning p.artist_since into since;
  if not found then
    raise exception 'No account with the handle @%', handle;
  end if;
  return since;
end;
$$;

revoke all on function public.set_artist_access(text, boolean) from public, anon, authenticated;
grant execute on function public.set_artist_access(text, boolean) to service_role;
