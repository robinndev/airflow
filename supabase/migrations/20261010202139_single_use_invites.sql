-- Invites are scarce: random, single-use codes the team grants to specific
-- artists, who pass them on. Later, other artists will get codes another
-- way (see docs/roadmap.md). Accounts no longer get a code automatically.

-- Only auto-generated codes existed so far, and none were handed out.
delete from public.invites;

alter table public.invites
  drop constraint invites_code_check,
  -- 4+4 characters with no look-alikes (no 0/O, 1/I): K7QH-3MPA.
  add constraint invites_code_check check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  add column redeemed_by uuid references public.profiles (id) on delete set null,
  add column redeemed_at timestamptz,
  add constraint invites_redeemed_together check ((redeemed_by is null) = (redeemed_at is null));

-- One invite per account.
create unique index invites_redeemed_by_key on public.invites (redeemed_by);

comment on column public.invites.note is 'Internal: why this code was granted (e.g. "beta wave 1"). Never shown to users.';

-- A random code from a strong source: bytes of gen_random_uuid(), skipping
-- the two that carry the UUID version and variant bits.
create function private.random_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := uuid_send(gen_random_uuid());
  code text := '';
  i int;
begin
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    code := code || substr(alphabet, get_byte(bytes, i) % 32 + 1, 1);
  end loop;
  return left(code, 4) || '-' || right(code, 4);
end;
$$;

create function private.grant_invites(owner uuid, how_many int, why text)
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
end;
$$;

-- Profiles no longer mint codes; a typed code is redeemed (once) instead.
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
      and i.redeemed_by is null
      and i.inviter_id <> uid
    returning i.inviter_id into inviter;

    if inviter is not null then
      update public.profiles set invited_by = inviter where id = uid;
    end if;
  end if;
end;
$$;

revoke all on function private.random_invite_code() from public, anon, authenticated;
revoke all on function private.grant_invites(uuid, int, text) from public, anon, authenticated;

-- For the team's script (`npm run invites`): only the secret key can call it.
create function public.grant_invites(handle text, how_many int, why text default null)
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
  return query select private.grant_invites(owner, how_many, why);
end;
$$;

revoke all on function public.grant_invites(text, int, text) from public, anon, authenticated;
grant execute on function public.grant_invites(text, int, text) to service_role;
