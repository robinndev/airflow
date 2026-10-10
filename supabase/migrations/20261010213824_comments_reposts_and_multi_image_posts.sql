-- Up to four images per post, reposts, and comments with replies.
--
-- The demo artists' posts (src/lib/profile/mock-db.ts, ids like `pst_3`) aren't
-- rows here, but people can repost and comment on them too: those references
-- go in the `*demo_post_id` columns. Drop the columns along with the demo data.

-- Up to four images per post ---------------------------------------------------
-- `images` is [{path, width, height, palette}, …]. It replaces the image_*
-- columns, which stay filled with the first image until every deployment reads
-- `images`; drop them after that.

alter table public.posts
  add column images jsonb not null default '[]'::jsonb;

update public.posts
set images = jsonb_build_array(
  jsonb_build_object(
    'path', image_path,
    'width', image_width,
    'height', image_height,
    'palette', coalesce(to_jsonb(image_palette), '[]'::jsonb)
  )
)
where image_path is not null;

create function private.check_post_images()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  image jsonb;
begin
  if jsonb_typeof(new.images) is distinct from 'array' or jsonb_array_length(new.images) > 4 then
    raise exception 'A post holds up to four images' using errcode = '23514';
  end if;
  for image in select value from jsonb_array_elements(new.images) loop
    if jsonb_typeof(image -> 'path') is distinct from 'string'
      or image ->> 'path' not like new.author_id::text || '/posts/%'
      or jsonb_typeof(image -> 'width') is distinct from 'number'
      or jsonb_typeof(image -> 'height') is distinct from 'number'
      or (image ->> 'width')::numeric not between 1 and 8192
      or (image ->> 'height')::numeric not between 1 and 8192
      or (image ? 'palette' and (
        jsonb_typeof(image -> 'palette') is distinct from 'array' or jsonb_array_length(image -> 'palette') > 8
      ))
    then
      raise exception 'Post images must be uploads of the author''s, with a size' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.check_post_images() from public, anon, authenticated;

create trigger posts_check_images
  before insert or update of images on public.posts
  for each row execute function private.check_post_images();

-- Reposts ----------------------------------------------------------------------
-- A repost pins someone's post to your own, with an optional note. It goes
-- away with the original, since the original's art is what it shows.

alter table public.posts
  add column quote_post_id uuid references public.posts (id) on delete cascade,
  add column quote_demo_post_id text check (quote_demo_post_id ~ '^pst_[0-9]+$'),
  add constraint posts_quote_one_target check (quote_post_id is null or quote_demo_post_id is null),
  drop constraint posts_body_check,
  add constraint posts_body_check check (
    char_length(body) <= 2000
    and (char_length(body) >= 1 or quote_post_id is not null or quote_demo_post_id is not null)
  );

create index posts_quote_post_id_idx on public.posts (quote_post_id) where quote_post_id is not null;
create index posts_quote_demo_post_id_idx on public.posts (quote_demo_post_id) where quote_demo_post_id is not null;

grant insert (images, quote_post_id, quote_demo_post_id) on public.posts to authenticated;

-- Comments and replies -----------------------------------------------------------
-- One level of replies: a reply hangs off a top-level comment of the same post.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  demo_post_id text check (demo_post_id ~ '^pst_[0-9]+$'),
  parent_id uuid references public.comments (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) <= 1000 and char_length(btrim(body)) >= 1),
  created_at timestamptz not null default now(),
  constraint comments_one_post check ((post_id is null) <> (demo_post_id is null))
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at) where post_id is not null;
create index comments_demo_post_id_created_at_idx on public.comments (demo_post_id, created_at) where demo_post_id is not null;
create index comments_parent_id_idx on public.comments (parent_id) where parent_id is not null;
create index comments_author_id_idx on public.comments (author_id);

create function private.check_comment_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.comments;
begin
  if new.parent_id is null then
    return new;
  end if;
  select * into parent from public.comments where id = new.parent_id;
  if parent.id is null
    or parent.parent_id is not null
    or parent.post_id is distinct from new.post_id
    or parent.demo_post_id is distinct from new.demo_post_id
  then
    raise exception 'Replies go on a top-level comment of the same post' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.check_comment_reply() from public, anon, authenticated;

create trigger comments_check_reply
  before insert on public.comments
  for each row execute function private.check_comment_reply();

alter table public.comments enable row level security;

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, demo_post_id, parent_id, author_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

create policy "Comments are visible to everyone"
  on public.comments for select
  to anon, authenticated
  using (true);

create policy "Artists comment as themselves"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

-- Authors can tidy up their own threads: delete any comment on their posts.
create policy "People delete their comments, and comments on their posts"
  on public.comments for delete
  to authenticated
  using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.posts
      where posts.id = comments.post_id and posts.author_id = (select auth.uid())
    )
  );
