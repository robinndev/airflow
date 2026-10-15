-- Settings (/settings): what each account chose for itself.
--
-- account_settings is private: one row per account, read and written only by
-- its owner (the settings page's Server Actions run as the user). It holds
-- the guest book entries the account doesn't want and whether it sees like
-- counts. No row = the defaults.
--
-- The guest book stays written only by triggers. A BEFORE INSERT trigger on
-- notifications drops the kinds the recipient muted, so every trigger that
-- writes one obeys it (a folded like is an insert first, so it's dropped
-- too). Commission notices and the studio's own notes can't be muted:
-- someone is waiting on you, or it's about your account.
--
-- profiles.time_zone is public on purpose: it's set only while the artist
-- shows their local time on their profile, and null otherwise.
--
-- Three windows into Supabase Auth for the account page, each for yourself
-- only: account_has_password() (social sign-ups have none until they set
-- one), my_sessions() and end_my_session() (where you're signed in).

create table public.account_settings (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  muted_notifications text[] not null default '{}'
    check (muted_notifications <@ array['like', 'comment', 'reply', 'mention', 'follow', 'repost', 'invite_joined']::text[]),
  hide_like_counts boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.account_settings enable row level security;

revoke all on public.account_settings from anon, authenticated;
grant select on public.account_settings to authenticated;
grant insert (user_id, muted_notifications, hide_like_counts) on public.account_settings to authenticated;
grant update (muted_notifications, hide_like_counts) on public.account_settings to authenticated;

create policy "People read their own settings"
  on public.account_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "People start their own settings"
  on public.account_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People change their own settings"
  on public.account_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function private.touch_account_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_account_settings() from public, anon, authenticated;

create trigger account_settings_touch
  before update on public.account_settings
  for each row execute function private.touch_account_settings();

-- Muted kinds never reach the guest book ------------------------------------------

create function private.skip_muted_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.account_settings s
    where s.user_id = new.recipient_id and new.kind = any (s.muted_notifications)
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.skip_muted_notification() from public, anon, authenticated;

create trigger notifications_skip_muted
  before insert on public.notifications
  for each row execute function private.skip_muted_notification();

-- Local time on the profile ---------------------------------------------------------

-- An IANA zone name ("America/Sao_Paulo", "America/Argentina/Buenos_Aires",
-- "UTC"); the app checks it against the browser's list before saving.
alter table public.profiles
  add column time_zone text
    check (time_zone is null or (char_length(time_zone) <= 64 and time_zone ~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+){0,2}$'));

grant update (time_zone) on public.profiles to authenticated;

-- Sign-in details, for yourself only --------------------------------------------------

-- Accounts made with Google, Discord or Twitch have no password until they set one.
create function public.account_has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(u.encrypted_password, '') <> ''
  from auth.users u
  where u.id = (select auth.uid());
$$;

revoke all on function public.account_has_password() from public, anon;
grant execute on function public.account_has_password() to authenticated;

-- Where you're signed in: each browser or device is a session.
create function public.my_sessions()
returns table (id uuid, created_at timestamptz, last_seen timestamptz, user_agent text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.created_at, greatest(s.updated_at, s.refreshed_at at time zone 'UTC', s.created_at), s.user_agent
  from auth.sessions s
  where s.user_id = (select auth.uid()) and (s.not_after is null or s.not_after > now())
  order by 3 desc
  limit 50;
$$;

revoke all on function public.my_sessions() from public, anon;
grant execute on function public.my_sessions() to authenticated;

-- Signs one of your other sessions out (its refresh tokens go with it). The
-- one you're using signs out the usual way.
create function public.end_my_session(session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.sessions s
  where s.id = session
    and s.user_id = (select auth.uid())
    and s.id::text is distinct from (select auth.jwt() ->> 'session_id');
  return found;
end;
$$;

revoke all on function public.end_my_session(uuid) from public, anon;
grant execute on function public.end_my_session(uuid) to authenticated;
