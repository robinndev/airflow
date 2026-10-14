-- Image posts hang in the gallery too.
--
-- The gallery is the artist's showcase, so every picture they post is also a
-- piece of their gallery, tied to its post:
-- - a trigger hangs one piece per picture when the post goes up, titled from
--   the caption ("Kinako's winter coat (2/3)");
-- - the piece shares the post's files (art/<uid>/posts/), so taking it out of
--   the gallery keeps the post and its files;
-- - deleting the post takes its pieces with it (on delete cascade).
-- Reposts aren't the reposter's art and stay out. A full gallery (2000
-- pieces) never stops anyone posting: the pictures just stay off it.
-- Existing image posts are hung at the end of this file.

alter table public.artworks
  add column post_id uuid references public.posts (id) on delete cascade,
  add column post_image smallint check (post_image between 0 and 3),
  add constraint artworks_post_image check ((post_id is null) = (post_image is null));

create unique index artworks_post_id_post_image_key on public.artworks (post_id, post_image) where post_id is not null;

-- Same rules as before, plus: a post's piece must be that post's own picture,
-- and it keeps the post's date.
create or replace function private.prepare_artwork()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.artworks where owner_id = new.owner_id) >= 2000 then
      raise exception 'A gallery holds up to 2000 pieces' using errcode = '23514';
    end if;
    new.created_at := coalesce((select created_at from public.posts where id = new.post_id), now());
  elsif new.owner_id <> old.owner_id then
    raise exception 'Artworks can''t change hands' using errcode = '42501';
  elsif new.post_id is distinct from old.post_id or new.post_image is distinct from old.post_image then
    raise exception 'A piece stays with its post' using errcode = '42501';
  end if;

  if new.post_id is not null then
    if not exists (
      select 1 from public.posts p
      where p.id = new.post_id
        and p.author_id = new.owner_id
        and p.images -> new.post_image ->> 'path' = new.image ->> 'path'
    ) then
      raise exception 'A post''s piece must be one of its own pictures' using errcode = '42501';
    end if;
  elsif coalesce(new.image ->> 'path', '') not like new.owner_id::text || '/gallery/%' then
    raise exception 'The image must be your own upload' using errcode = '42501';
  end if;
  if jsonb_typeof(new.image -> 'width') <> 'number'
    or jsonb_typeof(new.image -> 'height') <> 'number'
    or jsonb_typeof(coalesce(new.image -> 'palette', '[]')) <> 'array'
    or jsonb_array_length(coalesce(new.image -> 'palette', '[]')) > 8
  then
    raise exception 'The image must be your own upload' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(new.tags) as tag where char_length(tag) not between 1 and 30) then
    raise exception 'Keep each tag under 30 characters' using errcode = '23514';
  end if;
  if new.kind = 'personal' then
    new.client := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- A post's title, as written on a print: the caption's first clause, without
-- emoji (the app's captionOf() does the same).
create function private.caption_title(body text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      left(
        btrim(regexp_replace(
          coalesce(substring(coalesce(body, '') from '^[^\n,.!?—]*'), ''),
          '[\U0001F000-\U0001FAFF☀-➿️‍]', '', 'g'
        )),
        72
      ),
      ''
    ),
    'Untitled'
  );
$$;

revoke all on function private.caption_title(text) from public, anon, authenticated;

create function private.hang_post_pictures()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pictures int := jsonb_array_length(coalesce(new.images, '[]'::jsonb));
  title text;
begin
  if pictures = 0 or new.quote_post_id is not null or new.quote_demo_post_id is not null then
    return null;
  end if;
  if (select count(*) from public.artworks where owner_id = new.author_id) + pictures > 2000 then
    return null;
  end if;

  title := private.caption_title(new.body);
  insert into public.artworks (owner_id, title, image, post_id, post_image)
  select
    new.author_id,
    case when pictures = 1 then title else title || ' (' || picture.n || '/' || pictures || ')' end,
    picture.image,
    new.id,
    (picture.n - 1)::smallint
  from jsonb_array_elements(new.images) with ordinality as picture(image, n);
  return null;
end;
$$;

revoke all on function private.hang_post_pictures() from public, anon, authenticated;

create trigger posts_hang_in_gallery
  after insert on public.posts
  for each row execute function private.hang_post_pictures();

-- The image posts already up, hung in the order they were posted.
insert into public.artworks (owner_id, title, image, post_id, post_image)
select
  p.author_id,
  case
    when jsonb_array_length(p.images) = 1 then private.caption_title(p.body)
    else private.caption_title(p.body) || ' (' || picture.n || '/' || jsonb_array_length(p.images) || ')'
  end,
  picture.image,
  p.id,
  (picture.n - 1)::smallint
from public.posts p
cross join lateral jsonb_array_elements(p.images) with ordinality as picture(image, n)
where jsonb_array_length(p.images) > 0
  and p.quote_post_id is null
  and p.quote_demo_post_id is null
order by p.created_at, picture.n
on conflict do nothing;
