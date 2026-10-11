-- Favorites: what each artist saved to their moodboard (/favorites).
--
-- Three kinds of things can be saved: posts, art (gallery pieces and the
-- pieces on Explore's wall) and commission services. Real posts are referenced
-- by uuid and leave with the post. Everything that is still demo data goes in
-- `demo_id`: mock-db posts (`pst_3`), artworks (`art_4`), Explore's community
-- pieces (`pool-12088040`) and services (`svc_full`). Drop that column with
-- the demo data, and give each kind a real reference as it moves into a table.
--
-- Favorites are private: only their owner can read them.

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('post', 'art', 'service')),
  post_id uuid references public.posts (id) on delete cascade,
  demo_id text check (demo_id ~ '^[a-z]+[_-][a-z0-9_-]{1,60}$'),
  created_at timestamptz not null default now(),
  constraint favorites_one_target check ((post_id is null) <> (demo_id is null)),
  constraint favorites_post_kind check (post_id is null or kind = 'post')
);

create unique index favorites_user_post_key on public.favorites (user_id, post_id) where post_id is not null;
create unique index favorites_user_demo_key on public.favorites (user_id, kind, demo_id) where demo_id is not null;
create index favorites_user_id_created_at_idx on public.favorites (user_id, created_at desc);
create index favorites_post_id_idx on public.favorites (post_id) where post_id is not null;

-- Undo puts a favorite back where it was, so `created_at` can be set, but
-- never in the future. A board holds up to 5000 favorites.
create function private.check_favorite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_at > now() then
    new.created_at := now();
  end if;
  if (select count(*) from public.favorites where user_id = new.user_id) >= 5000 then
    raise exception 'A moodboard holds up to 5000 favorites' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.check_favorite() from public, anon, authenticated;

create trigger favorites_check
  before insert on public.favorites
  for each row execute function private.check_favorite();

alter table public.favorites enable row level security;

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (kind, post_id, demo_id, created_at) on public.favorites to authenticated;

create policy "Artists see their own favorites"
  on public.favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Artists save favorites as themselves"
  on public.favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Artists remove their own favorites"
  on public.favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);
