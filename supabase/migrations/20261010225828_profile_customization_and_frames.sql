-- Profile customization, the "About" board and avatar frames.
--
-- `customization` (theme, name style, buttons, layout, equipped frame, custom
-- CSS) and `about` (free-form board of text, lists, images, stickers, HTML)
-- are JSON documents shaped by src/lib/customization/*. Nobody gets a column
-- grant on them: edits go through the app's server action, which validates
-- the document, sanitizes custom CSS/HTML and applies plan gating (Flow+
-- fields) before writing with the secret key. Everyone can read them, like
-- the rest of the profile.

alter table public.profiles
  add column customization jsonb not null default '{}'::jsonb,
  add column about jsonb not null default '{}'::jsonb;

-- Belt and braces against oversized documents (the app caps them lower).
alter table public.profiles
  add constraint profiles_customization_size check (pg_column_size(customization) < 64000),
  add constraint profiles_about_size check (pg_column_size(about) < 256000);

-- Frames people own. Free frames are claimed from the shop; paid ones will be
-- inserted by checkout once payments exist. Only the server writes here.
create table public.owned_frames (
  user_id uuid not null references public.profiles (id) on delete cascade,
  frame_id text not null check (frame_id ~ '^[a-z0-9-]{2,40}$'),
  source text not null default 'claim' check (source in ('claim', 'purchase', 'gift')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, frame_id)
);

comment on table public.owned_frames is 'Avatar frames an account owns (catalog in src/lib/frames.ts). Written by the server only.';

alter table public.owned_frames enable row level security;

grant select on public.owned_frames to authenticated;

create policy "Artists see the frames they own"
  on public.owned_frames for select
  to authenticated
  using ((select auth.uid()) = user_id);
