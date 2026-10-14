-- Artist codes pass on: whoever becomes an artist with a code gets 2 codes
-- of their own, to let 2 more artists in. And the site tells you, once, when
-- codes arrive (a little gift on your next visit): `codes_seen_at` is when
-- you last saw them, so only codes granted after it are new.

alter table public.profiles add column codes_seen_at timestamptz;

comment on column public.profiles.codes_seen_at is 'When the account last saw its artist codes (the "you got codes" gift). Codes granted after it are new.';

-- Only the owner sets it, and only to now (mark_codes_seen); no column grant.
create function public.mark_codes_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set codes_seen_at = now() where id = auth.uid();
$$;

revoke all on function public.mark_codes_seen() from public, anon;
grant execute on function public.mark_codes_seen() to authenticated;

-- Same as before, plus: a new artist gets codes to pass on.
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
      perform private.grant_invites(uid, 2, 'passed on: joined with a code');
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
  perform private.grant_invites(uid, 2, 'passed on: used a code');
  delete from private.artist_code_attempts where user_id = uid;
  return 'ok';
end;
$$;

revoke all on function public.redeem_artist_code(text) from public, anon;
grant execute on function public.redeem_artist_code(text) to authenticated;

-- Artists who got in with a code before this rule get their 2 codes now.
select private.grant_invites(p.id, 2, 'passed on: joined with a code')
from public.profiles p
where p.invited_by is not null
  and p.artist_since is not null
  and not exists (select 1 from public.invites i where i.inviter_id = p.id);
