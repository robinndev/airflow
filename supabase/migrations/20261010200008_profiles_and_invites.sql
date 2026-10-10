-- Accounts: one public profile per auth user, plus artist-to-artist invites.
--
-- The handle is the profile URL (artiflow.com/<handle>) and the artist's
-- signature. Its rules mirror src/lib/auth/handles.ts; reserved words and
-- demo handles are checked in the app before sign-up.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique
    check (handle ~ '^[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$' and handle !~ '\.\.'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 300),
  -- Who brought this artist in: a real inviter, and/or the code they typed
  -- (demo codes have no inviter row).
  invited_by uuid references public.profiles (id) on delete set null,
  invite_code text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public artist profile, one per auth user.';

-- Every artist gets a personal invite code to share (MIRA-7Q2K style).
create table public.invites (
  code text primary key check (code ~ '^[A-Z0-9]{1,8}-[A-Z0-9]{4}$'),
  -- Codes compare without case, spaces or dashes ("mira 7q2k" works).
  canonical text generated always as (upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))) stored unique,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now()
);

create index invites_inviter_id_idx on public.invites (inviter_id);
create index profiles_invited_by_idx on public.profiles (invited_by);

-- Row level security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invites enable row level security;

-- Profiles are public pages.
create policy "Profiles are visible to everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Owners can edit their own profile, but only the editable columns.
create policy "Owners can update their profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- New tables aren't exposed to the Data API by default; grant exactly what
-- the app uses. Owners may only edit these profile columns.
revoke all on public.profiles, public.invites from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, bio) on public.profiles to authenticated;
grant select on public.invites to authenticated;

-- Codes are looked up on the server; artists can see their own.
create policy "Artists can see their own invites"
  on public.invites for select
  to authenticated
  using ((select auth.uid()) = inviter_id);

-- New accounts ---------------------------------------------------------------

-- Creates the profile and a personal invite code when an account is made
-- with a handle (email sign-up). Social sign-ups without a handle pick one
-- in onboarding, so they're skipped here.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(new.raw_user_meta_data ->> 'handle');
  typed_code text := nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '');
  inviter uuid;
  prefix text;
  candidate text;
begin
  if wanted is null then
    return new;
  end if;

  if typed_code is not null then
    select i.inviter_id into inviter
    from public.invites i
    where i.canonical = upper(regexp_replace(typed_code, '[^A-Za-z0-9]', '', 'g'));
  end if;

  insert into public.profiles (id, handle, display_name, invited_by, invite_code)
  values (
    new.id,
    wanted,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), wanted),
    inviter,
    upper(typed_code)
  );

  prefix := upper(left(regexp_replace(wanted, '[^a-z0-9]', '', 'g'), 8));
  loop
    candidate := prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    begin
      insert into public.invites (code, inviter_id) values (candidate, new.id);
      exit;
    exception when unique_violation then
      -- Same code drawn twice: draw again.
    end;
  end loop;

  return new;
end;
$$;

-- Runs only as a trigger; not callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
