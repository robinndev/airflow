-- Follows and likes.
--
-- Follows: an artist follows another account, or one of the demo artists in
-- src/lib/profile/mock-db.ts (`demo_handle`; they have no account, drop the
-- column with the demo data). Who follows whom is public, like the counts on
-- every profile.
--
-- Likes on posts: real posts by uuid, demo posts by their `pst_` id (like
-- comments). Who liked what is private to the person who liked it; only the
-- counts are public, through post_like_counts(). That way liking a piece
-- (mature art included) never shows up on anyone else's screen.

-- Follows ------------------------------------------------------------------------

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid references public.profiles (id) on delete cascade,
  demo_handle text check (demo_handle ~ '^[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$'),
  created_at timestamptz not null default now(),
  constraint follows_one_target check ((followee_id is null) <> (demo_handle is null)),
  constraint follows_not_self check (followee_id is distinct from follower_id)
);

create unique index follows_pair_key on public.follows (follower_id, followee_id) where followee_id is not null;
create unique index follows_demo_key on public.follows (follower_id, demo_handle) where demo_handle is not null;
create index follows_follower_id_created_at_idx on public.follows (follower_id, created_at desc);
create index follows_followee_id_idx on public.follows (followee_id) where followee_id is not null;
create index follows_demo_handle_idx on public.follows (demo_handle) where demo_handle is not null;

-- Up to 5000 follows, and 400 new ones a day (follow spam brake).
create function private.check_follow()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.follows where follower_id = new.follower_id) >= 5000 then
    raise exception 'You can follow up to 5000 artists' using errcode = '23514';
  end if;
  if (
    select count(*) from public.follows
    where follower_id = new.follower_id and created_at > now() - interval '1 day'
  ) >= 400 then
    raise exception 'You''ve followed a lot of artists today. Try again tomorrow.' using errcode = '23514';
  end if;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.check_follow() from public, anon, authenticated;

create trigger follows_check
  before insert on public.follows
  for each row execute function private.check_follow();

alter table public.follows enable row level security;

revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert (followee_id, demo_handle) on public.follows to authenticated;
grant delete on public.follows to authenticated;

create policy "Follows are visible to everyone"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "Artists follow as themselves"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "Artists unfollow for themselves"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- Followers and following for a batch of handles. A demo artist's followers
-- are the rows naming its handle; a real account's are the rows naming its id
-- (a `demo_handle` that happens to match a real account doesn't count).
create function public.follow_counts(handles text[])
returns table (handle text, followers integer, following integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    h.handle,
    (case
      when p.id is null then (select count(*) from public.follows f where f.demo_handle = h.handle)
      else (select count(*) from public.follows f where f.followee_id = p.id)
    end)::integer,
    (select count(*) from public.follows f where f.follower_id = p.id)::integer
  from unnest(handles) as h (handle)
  left join public.profiles p on p.handle = h.handle;
$$;

revoke execute on function public.follow_counts(text[]) from public;
grant execute on function public.follow_counts(text[]) to anon, authenticated;

-- Likes --------------------------------------------------------------------------

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  demo_post_id text check (demo_post_id ~ '^pst_[0-9]+$'),
  created_at timestamptz not null default now(),
  constraint post_likes_one_post check ((post_id is null) <> (demo_post_id is null))
);

create unique index post_likes_user_post_key on public.post_likes (user_id, post_id) where post_id is not null;
create unique index post_likes_user_demo_key on public.post_likes (user_id, demo_post_id) where demo_post_id is not null;
create index post_likes_user_id_idx on public.post_likes (user_id);
create index post_likes_post_id_idx on public.post_likes (post_id) where post_id is not null;
create index post_likes_demo_post_id_idx on public.post_likes (demo_post_id) where demo_post_id is not null;

alter table public.post_likes enable row level security;

revoke all on public.post_likes from anon, authenticated;
grant select, delete on public.post_likes to authenticated;
grant insert (post_id, demo_post_id) on public.post_likes to authenticated;

create policy "Artists see their own likes"
  on public.post_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Artists like as themselves"
  on public.post_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Artists take back their own likes"
  on public.post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Like counts for a batch of posts. Runs as its owner because the rows are
-- private; it returns totals only, never who liked.
create function public.post_like_counts(post_ids uuid[], demo_post_ids text[])
returns table (post_id uuid, demo_post_id text, likes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select l.post_id, null::text, count(*)::integer
  from public.post_likes l
  where l.post_id = any (post_ids)
  group by l.post_id
  union all
  select null::uuid, l.demo_post_id, count(*)::integer
  from public.post_likes l
  where l.demo_post_id = any (demo_post_ids)
  group by l.demo_post_id;
$$;

revoke execute on function public.post_like_counts(uuid[], text[]) from public;
grant execute on function public.post_like_counts(uuid[], text[]) to anon, authenticated;
