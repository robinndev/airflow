-- What an artist draws (src/lib/profile/draws.ts): who they draw (asked at
-- sign-up) and what they make (from "Edit profile"). Profiles show them as
-- labels and Explore filters open studios by them. Owners update the column
-- directly, like their other details.

create type public.draw_tag as enum (
  'human', 'anthro', 'humanoid', 'feral', 'pony',
  'oc_design', 'concept', 'background', 'chibi', 'pixel', 'emote', 'ref_sheet', 'animation'
);

alter table public.profiles
  add column draws public.draw_tag[] not null default '{}' check (cardinality(draws) <= 13);

-- Discovery filters on it ("artists who draw ferals").
create index profiles_draws_idx on public.profiles using gin (draws);

grant update (draws) on public.profiles to authenticated;

-- Email sign-ups tick their subjects on the form (metadata `draws`). Unknown
-- values are dropped, never fatal: a bad tag mustn't cost anyone their account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'handle' is null then
    return new;
  end if;
  perform private.create_profile(
    new.id,
    lower(new.raw_user_meta_data ->> 'handle'),
    new.raw_user_meta_data ->> 'display_name',
    nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '')
  );
  if jsonb_typeof(new.raw_user_meta_data -> 'draws') = 'array' then
    -- Each known tag once, in catalog order.
    update public.profiles
    set draws = array(
      select tag
      from unnest(enum_range(null::public.draw_tag)) as tag
      where tag::text in (select jsonb_array_elements_text(new.raw_user_meta_data -> 'draws'))
    )
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
