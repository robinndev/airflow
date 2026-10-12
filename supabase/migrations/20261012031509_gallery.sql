-- Gallery: an artist's finished pieces, their characters and their collections.
--
-- Three kinds of thing (src/lib/gallery/types.ts):
-- - artworks: one piece each (an illustration, a sketch, a ref sheet). Can be
--   shown on its own, on characters and in collections at the same time.
-- - characters: an original character (OC) with a page of their own: name,
--   species, pronouns, personality, story, colors, who designed them, and
--   their art in sections (design, outfits, expressions & poses, alternate
--   versions, art). Can point at an adoptable listing when they're for sale.
-- - collections: a themed set of pieces ("Quiet Worlds", "Hand studies").
--
-- Artists write their own rows under row level security (Server Actions in
-- src/app/(site)/[handle]/gallery/actions.ts validate first; the triggers
-- below are the backstop). Everything here is public to read.
--
-- For now a character's art is the owner's own. Pieces by other artists
-- (a delivered commission shown on the buyer's OC) come with the commission
-- flow, with credits.

-- Artworks ---------------------------------------------------------------------

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  kind text not null default 'personal' check (kind in ('personal', 'commission')),
  -- Commissions: who it was made for, a handle or a name.
  client text check (client is null or char_length(client) between 1 and 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  -- { path, width, height, palette } in art/<owner id>/gallery/.
  image jsonb not null check (jsonb_typeof(image) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artworks_owner_id_created_at_idx on public.artworks (owner_id, created_at desc);

create function private.prepare_artwork()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.artworks where owner_id = new.owner_id) >= 2000 then
      raise exception 'A gallery holds up to 2000 pieces' using errcode = '23514';
    end if;
    new.created_at := now();
  elsif new.owner_id <> old.owner_id then
    raise exception 'Artworks can''t change hands' using errcode = '42501';
  end if;

  if coalesce(new.image ->> 'path', '') not like new.owner_id::text || '/gallery/%'
    or jsonb_typeof(new.image -> 'width') <> 'number'
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

revoke all on function private.prepare_artwork() from public, anon, authenticated;

create trigger artworks_prepare
  before insert or update on public.artworks
  for each row execute function private.prepare_artwork();

alter table public.artworks enable row level security;

revoke all on public.artworks from anon, authenticated;
grant select on public.artworks to anon, authenticated;
grant insert (title, description, kind, client, tags, image) on public.artworks to authenticated;
grant update (title, description, kind, client, tags) on public.artworks to authenticated;
grant delete on public.artworks to authenticated;

create policy "Artworks are public"
  on public.artworks for select
  to anon, authenticated
  using (true);

create policy "Artists add their own artworks"
  on public.artworks for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Artists edit their own artworks"
  on public.artworks for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Artists delete their own artworks"
  on public.artworks for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Characters -------------------------------------------------------------------

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- The page's address, /<handle>/characters/<slug>; kept by the Server Action.
  slug text not null check (char_length(slug) between 1 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 40),
  -- One line in the artist's hand ("Naps anywhere. Melts above 30°C.").
  tagline text not null default '' check (char_length(tagline) <= 120),
  species text not null default '' check (char_length(species) <= 40),
  pronouns text not null default '' check (char_length(pronouns) <= 30),
  story text not null default '' check (char_length(story) <= 6000),
  -- Personality, a few words each.
  traits text[] not null default '{}' check (cardinality(traits) <= 8),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  -- Their colors, as on a ref sheet. Empty: taken from the cover.
  palette text[] not null default '{}' check (cardinality(palette) <= 8),
  -- Who designed them, when it isn't the owner: a handle or a name.
  designer text check (designer is null or char_length(designer) between 1 and 60),
  cover_artwork_id uuid references public.artworks (id) on delete set null,
  -- Up for adoption: the listing that sells them.
  adoptable_id uuid references public.adoptables (id) on delete set null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_owner_slug_key unique (owner_id, slug)
);

create index characters_cover_artwork_id_idx on public.characters (cover_artwork_id) where cover_artwork_id is not null;
create index characters_adoptable_id_idx on public.characters (adoptable_id) where adoptable_id is not null;

create function private.prepare_character()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.characters where owner_id = new.owner_id) >= 100 then
      raise exception 'You can keep up to 100 characters' using errcode = '23514';
    end if;
    new.position := coalesce((select max(position) + 1 from public.characters where owner_id = new.owner_id), 0);
    new.created_at := now();
  elsif new.owner_id <> old.owner_id then
    raise exception 'Characters change hands only through a transfer' using errcode = '42501';
  end if;

  if new.cover_artwork_id is not null
    and not exists (select 1 from public.artworks where id = new.cover_artwork_id and owner_id = new.owner_id)
  then
    raise exception 'The cover must be one of your artworks' using errcode = '42501';
  end if;
  if new.adoptable_id is not null
    and not exists (select 1 from public.adoptables where id = new.adoptable_id and owner_id = new.owner_id)
  then
    raise exception 'Only your own adoptables can be linked' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(new.traits) as trait where char_length(trait) not between 1 and 40) then
    raise exception 'Keep each trait under 40 characters' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.tags) as tag where char_length(tag) not between 1 and 30) then
    raise exception 'Keep each tag under 30 characters' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.palette) as color where color !~ '^#[0-9a-f]{6}$') then
    raise exception 'Colors are #rrggbb' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_character() from public, anon, authenticated;

create trigger characters_prepare
  before insert or update on public.characters
  for each row execute function private.prepare_character();

alter table public.characters enable row level security;

revoke all on public.characters from anon, authenticated;
grant select on public.characters to anon, authenticated;
grant insert (slug, name, tagline, species, pronouns, story, traits, tags, palette, designer, cover_artwork_id, adoptable_id)
  on public.characters to authenticated;
grant update (slug, name, tagline, species, pronouns, story, traits, tags, palette, designer, cover_artwork_id, adoptable_id, position)
  on public.characters to authenticated;
grant delete on public.characters to authenticated;

create policy "Characters are public"
  on public.characters for select
  to anon, authenticated
  using (true);

create policy "Artists create their own characters"
  on public.characters for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Artists edit their own characters"
  on public.characters for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Artists delete their own characters"
  on public.characters for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- A character's art, in sections.
create table public.character_art (
  character_id uuid not null references public.characters (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  section text not null default 'art' check (section in ('design', 'outfits', 'expressions', 'versions', 'art')),
  created_at timestamptz not null default now(),
  primary key (character_id, artwork_id)
);

create index character_art_artwork_id_idx on public.character_art (artwork_id);

-- Collections ------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slug text not null check (char_length(slug) between 1 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  cover_artwork_id uuid references public.artworks (id) on delete set null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_owner_slug_key unique (owner_id, slug)
);

create index collections_cover_artwork_id_idx on public.collections (cover_artwork_id) where cover_artwork_id is not null;

create function private.prepare_collection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.collections where owner_id = new.owner_id) >= 100 then
      raise exception 'You can keep up to 100 collections' using errcode = '23514';
    end if;
    new.position := coalesce((select max(position) + 1 from public.collections where owner_id = new.owner_id), 0);
    new.created_at := now();
  elsif new.owner_id <> old.owner_id then
    raise exception 'Collections can''t change hands' using errcode = '42501';
  end if;

  if new.cover_artwork_id is not null
    and not exists (select 1 from public.artworks where id = new.cover_artwork_id and owner_id = new.owner_id)
  then
    raise exception 'The cover must be one of your artworks' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_collection() from public, anon, authenticated;

create trigger collections_prepare
  before insert or update on public.collections
  for each row execute function private.prepare_collection();

alter table public.collections enable row level security;

revoke all on public.collections from anon, authenticated;
grant select on public.collections to anon, authenticated;
grant insert (slug, title, description, cover_artwork_id) on public.collections to authenticated;
grant update (slug, title, description, cover_artwork_id, position) on public.collections to authenticated;
grant delete on public.collections to authenticated;

create policy "Collections are public"
  on public.collections for select
  to anon, authenticated
  using (true);

create policy "Artists create their own collections"
  on public.collections for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Artists edit their own collections"
  on public.collections for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Artists delete their own collections"
  on public.collections for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create table public.collection_art (
  collection_id uuid not null references public.collections (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, artwork_id)
);

create index collection_art_artwork_id_idx on public.collection_art (artwork_id);

-- Placing art on characters and in collections ------------------------------
-- Only your own art, on your own characters and collections; a character
-- holds up to 300 pieces, a collection up to 500.

create function private.check_character_art()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid := (select owner_id from public.characters where id = new.character_id);
begin
  if owner is null or not exists (select 1 from public.artworks where id = new.artwork_id and owner_id = owner) then
    raise exception 'Only your own art goes on your characters' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.character_art where character_id = new.character_id) >= 300 then
      raise exception 'A character holds up to 300 pieces' using errcode = '23514';
    end if;
    new.created_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.check_character_art() from public, anon, authenticated;

create trigger character_art_check
  before insert or update on public.character_art
  for each row execute function private.check_character_art();

create function private.check_collection_art()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid := (select owner_id from public.collections where id = new.collection_id);
begin
  if owner is null or not exists (select 1 from public.artworks where id = new.artwork_id and owner_id = owner) then
    raise exception 'Only your own art goes in your collections' using errcode = '42501';
  end if;
  if (select count(*) from public.collection_art where collection_id = new.collection_id) >= 500 then
    raise exception 'A collection holds up to 500 pieces' using errcode = '23514';
  end if;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.check_collection_art() from public, anon, authenticated;

create trigger collection_art_check
  before insert on public.collection_art
  for each row execute function private.check_collection_art();

alter table public.character_art enable row level security;
alter table public.collection_art enable row level security;

revoke all on public.character_art, public.collection_art from anon, authenticated;
grant select on public.character_art, public.collection_art to anon, authenticated;
grant insert (character_id, artwork_id, section) on public.character_art to authenticated;
grant update (section) on public.character_art to authenticated;
grant delete on public.character_art to authenticated;
grant insert (collection_id, artwork_id) on public.collection_art to authenticated;
grant delete on public.collection_art to authenticated;

create policy "Character art is public"
  on public.character_art for select
  to anon, authenticated
  using (true);

create policy "Artists place art on their own characters"
  on public.character_art for insert
  to authenticated
  with check (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = (select auth.uid())));

create policy "Artists arrange their own characters' art"
  on public.character_art for update
  to authenticated
  using (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = (select auth.uid())));

create policy "Artists take art off their own characters"
  on public.character_art for delete
  to authenticated
  using (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = (select auth.uid())));

create policy "Collection art is public"
  on public.collection_art for select
  to anon, authenticated
  using (true);

create policy "Artists add art to their own collections"
  on public.collection_art for insert
  to authenticated
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = (select auth.uid())));

create policy "Artists take art out of their own collections"
  on public.collection_art for delete
  to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = (select auth.uid())));

-- Favorites: real artworks and characters --------------------------------------
-- Gallery hearts save real pieces by `artwork_id`; characters are saved on
-- their own (`character_id`), not just their artist. Demo ones keep `demo_id`.

alter table public.favorites drop constraint favorites_kind_check;
alter table public.favorites add constraint favorites_kind_check check (kind in ('post', 'art', 'service', 'character'));

alter table public.favorites
  add column artwork_id uuid references public.artworks (id) on delete cascade,
  add column character_id uuid references public.characters (id) on delete cascade;

alter table public.favorites drop constraint favorites_one_target;
alter table public.favorites
  add constraint favorites_one_target check (num_nonnulls(post_id, artwork_id, character_id, demo_id) = 1),
  add constraint favorites_artwork_kind check (artwork_id is null or kind = 'art'),
  add constraint favorites_character_kind check (character_id is null or kind = 'character');

create unique index favorites_user_artwork_key on public.favorites (user_id, artwork_id) where artwork_id is not null;
create unique index favorites_user_character_key on public.favorites (user_id, character_id) where character_id is not null;
create index favorites_artwork_id_idx on public.favorites (artwork_id) where artwork_id is not null;
create index favorites_character_id_idx on public.favorites (character_id) where character_id is not null;

grant insert (artwork_id, character_id) on public.favorites to authenticated;
