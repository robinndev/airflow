-- Paid plans and what they unlock on the profile. Flow+ can use animated
-- GIFs for the profile picture and cover; free accounts use still images.
-- (The higher tier joins this list once it has a name.) Plans are set by the
-- team (`npm run plans`); people can't change their own.

alter table public.profiles
  add column plan text not null default 'free' check (plan in ('free', 'flow_plus'));
-- No column grant: `plan` stays read-only for users.

update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/gif']
where id = 'art';

-- Enforced here too, not just in the app: a free account can't point its
-- picture or cover at a GIF, even by calling the API directly.
create function private.enforce_profile_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan <> 'flow_plus'
    and (
      (new.avatar is distinct from old.avatar and new.avatar ->> 'path' like '%.gif')
      or (new.banner is distinct from old.banner and new.banner ->> 'path' like '%.gif')
    )
  then
    raise exception 'Animated profile images are part of Flow+' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_profile_media() from public, anon, authenticated;

create trigger profiles_enforce_media
  before update of avatar, banner on public.profiles
  for each row execute function private.enforce_profile_media();
