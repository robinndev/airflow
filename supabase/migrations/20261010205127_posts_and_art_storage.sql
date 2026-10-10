-- Posts by real accounts, profile pictures and covers, and the storage
-- bucket the art lives in. Files go to art/<user id>/…; each artist can only
-- write and delete inside their own folder. Images are public to read.

-- Posts ----------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('finished', 'wip', 'sketch', 'update')),
  body text not null check (char_length(body) between 1 and 2000),
  -- One image per post for now: its path in the `art` bucket, size and palette
  -- (dominant colors, extracted in the browser before upload).
  image_path text,
  image_width int check (image_width between 1 and 8192),
  image_height int check (image_height between 1 and 8192),
  image_palette text[] check (cardinality(image_palette) <= 8),
  created_at timestamptz not null default now(),
  constraint posts_image_complete check (
    (image_path is null) = (image_width is null) and (image_path is null) = (image_height is null)
  ),
  constraint posts_image_in_own_folder check (image_path is null or image_path like author_id::text || '/%')
);

create index posts_author_id_created_at_idx on public.posts (author_id, created_at desc);
create index posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, kind, body, image_path, image_width, image_height, image_palette) on public.posts to authenticated;
grant delete on public.posts to authenticated;

create policy "Posts are visible to everyone"
  on public.posts for select
  to anon, authenticated
  using (true);

create policy "Artists post as themselves"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Artists delete their own posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- Profile pictures and covers: {path, width, height, palette} ---------------

alter table public.profiles
  add column avatar jsonb,
  add column banner jsonb,
  add constraint profiles_avatar_in_own_folder check (avatar is null or avatar ->> 'path' like id::text || '/%'),
  add constraint profiles_banner_in_own_folder check (banner is null or banner ->> 'path' like id::text || '/%');

grant update (avatar, banner) on public.profiles to authenticated;

-- Storage ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('art', 'art', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Artists upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'art' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Owners can see (and so delete) their own files; everyone else reads them
-- through public URLs, which need no policy and don't allow listing.
create policy "Artists see their own files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'art' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists delete their own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'art' and (storage.foldername(name))[1] = (select auth.uid())::text);
