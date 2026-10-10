-- Social sign-ups (Google, Discord, Twitch) arrive without a handle, so their
-- profile is created later, when they pick one in onboarding. Both paths now
-- share one function in a private (not API-exposed) schema.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.create_profile(uid uuid, wanted text, display text, typed_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter uuid;
  prefix text;
  candidate text;
begin
  if typed_code is not null then
    select i.inviter_id into inviter
    from public.invites i
    where i.canonical = upper(regexp_replace(typed_code, '[^A-Za-z0-9]', '', 'g'));
  end if;

  insert into public.profiles (id, handle, display_name, invited_by, invite_code)
  values (uid, wanted, coalesce(nullif(trim(display), ''), wanted), inviter, upper(typed_code));

  prefix := upper(left(regexp_replace(wanted, '[^a-z0-9]', '', 'g'), 8));
  loop
    candidate := prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    begin
      insert into public.invites (code, inviter_id) values (candidate, uid);
      exit;
    exception when unique_violation then
      -- Same code drawn twice: draw again.
    end;
  end loop;
end;
$$;

revoke all on function private.create_profile(uuid, text, text, text) from public, anon, authenticated;

-- Email sign-ups: same behavior as before, now through the shared function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'handle' is null then
    return new;
  end if;
  perform private.create_profile(
    new.id,
    lower(new.raw_user_meta_data ->> 'handle'),
    new.raw_user_meta_data ->> 'display_name',
    nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '')
  );
  return new;
end;
$$;

-- Onboarding: only the server (secret key) may call this, for the signed-in
-- user it has already verified. Not callable by visitors or users directly.
create function public.claim_profile(uid uuid, wanted text, display text, typed_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.create_profile(uid, wanted, display, typed_code);
$$;

revoke all on function public.claim_profile(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_profile(uuid, text, text, text) to service_role;
