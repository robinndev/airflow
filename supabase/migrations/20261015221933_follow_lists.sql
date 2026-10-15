-- Followers and following lists (the profile's /followers and /following).
--
-- Who follows whom is already public (follows_and_likes.sql), so this runs as
-- the caller. One page at a time, newest follow first, every row carrying the
-- size of the whole (filtered) list. Optional filters: words that find
-- someone by handle or name, and `p_follows`, an account: only the people who
-- also follow it (the viewer's "also follow you").
--
-- A demo artist (no account) is followed by handle: their followers are the
-- rows naming it, and they follow no one. In a following list they come back
-- with only `handle` set; the app fills in the rest from its demo data.

-- Followers newest first, without sorting the whole list.
create index follows_followee_id_created_at_idx on public.follows (followee_id, created_at desc) where followee_id is not null;
create index follows_demo_handle_created_at_idx on public.follows (demo_handle, created_at desc) where demo_handle is not null;
drop index public.follows_followee_id_idx;
drop index public.follows_demo_handle_idx;

create function public.follow_list(
  p_handle text,
  p_list text,
  p_query text default null,
  p_follows uuid default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar jsonb,
  banner jsonb,
  plan text,
  draws text[],
  artist_since timestamptz,
  verified_at timestamptz,
  followed_at timestamptz,
  total integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with target as (
    select p.id from public.profiles p where p.handle = p_handle
  ),
  edges as (
    -- Followers of an account.
    select f.follower_id as person_id, null::text as demo_handle, f.created_at
    from public.follows f
    where p_list = 'followers' and f.followee_id = (select t.id from target t)
    union all
    -- Followers of a demo artist (a handle no account holds).
    select f.follower_id, null, f.created_at
    from public.follows f
    where p_list = 'followers' and f.demo_handle = p_handle and not exists (select 1 from target)
    union all
    -- Accounts and demo artists they follow.
    select f.followee_id, f.demo_handle, f.created_at
    from public.follows f
    where p_list = 'following' and f.follower_id = (select t.id from target t)
  ),
  words as (
    -- Typed words match literally: % and _ (common in handles) aren't wildcards.
    select '%' || replace(replace(replace(nullif(btrim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  people as (
    select
      p.id,
      coalesce(p.handle, e.demo_handle) as handle,
      p.display_name,
      p.avatar,
      p.banner,
      p.plan,
      p.draws::text[] as draws,
      p.artist_since,
      p.verified_at,
      e.created_at as followed_at
    from edges e
    left join public.profiles p on p.id = e.person_id
    cross join words w
    where (e.person_id is null or p.id is not null)
      and (
        w.pattern is null
        or coalesce(p.handle, e.demo_handle) ilike w.pattern
        or p.display_name ilike w.pattern
      )
      and (
        p_follows is null
        or exists (select 1 from public.follows g where g.follower_id = e.person_id and g.followee_id = p_follows)
      )
  )
  select people.*, (count(*) over ())::integer as total
  from people
  order by people.followed_at desc, people.handle
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.follow_list(text, text, text, uuid, integer, integer) from public;
grant execute on function public.follow_list(text, text, text, uuid, integer, integer) to anon, authenticated;
