-- A used invite stays used even if the account that used it is deleted:
-- `redeemed_at` is what marks it used; `redeemed_by` may later become null.
-- (Before, deleting such an account failed on the paired check.)

alter table public.invites
  drop constraint invites_redeemed_together,
  add constraint invites_redeemed_by_needs_date check (redeemed_by is null or redeemed_at is not null);

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
      update public.profiles set invited_by = inviter where id = uid;
    end if;
  end if;
end;
$$;
