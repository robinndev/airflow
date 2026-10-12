import "server-only";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { ACCOUNT_COLUMNS, configured, type AccountRow } from "@/lib/profile/accounts";
import { createSupabasePublic } from "@/lib/supabase/server";
import type { CharacterRecord, CollectionRecord } from "./assemble";
import { isSection, type Piece } from "./types";

/*
 * Real galleries (Supabase `artworks`, `characters`, `collections`) as the
 * shapes assemble.ts takes. Public reads with the cookie-less client: callers
 * cache them ("use cache") and the gallery's Server Actions invalidate the
 * tag. A database without the gallery migration reads as an empty gallery.
 */

export type ArtworkRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  kind: "personal" | "commission";
  client: string | null;
  tags: string[];
  image: StoredImage;
  created_at: string;
};

type CharacterRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  species: string;
  pronouns: string;
  story: string;
  traits: string[];
  tags: string[];
  palette: string[];
  designer: string | null;
  cover_artwork_id: string | null;
  adoptable_id: string | null;
  created_at: string;
  character_art: { artwork_id: string; section: string }[];
};

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_artwork_id: string | null;
  created_at: string;
  collection_art: { artwork_id: string }[];
};

export const ARTWORK_COLUMNS = "id, owner_id, title, description, kind, client, tags, image, created_at";
const CHARACTER_COLUMNS =
  "id, slug, name, tagline, species, pronouns, story, traits, tags, palette, designer, cover_artwork_id, adoptable_id, created_at, character_art(artwork_id, section)";
const COLLECTION_COLUMNS = "id, slug, title, description, cover_artwork_id, created_at, collection_art(artwork_id)";
const OWNER = "owner:profiles!inner(handle)";

/** PostgREST / Postgres codes for "that table doesn't exist here yet". */
const NOT_MIGRATED = new Set(["42P01", "PGRST205", "PGRST200"]);

export function toPiece(row: ArtworkRow, ownerHandle: string): Piece {
  return {
    id: row.id,
    ownerHandle,
    title: row.title,
    description: row.description || undefined,
    image: toImageAsset(row.image, row.title),
    kind: row.kind,
    client: row.kind === "commission" ? (row.client ?? undefined) : undefined,
    tags: row.tags,
    likes: 0,
    createdAt: row.created_at,
  };
}

/** A real account's whole gallery. */
export async function fetchGalleryByHandle(handle: string) {
  const empty = { pieces: [] as Piece[], characters: [] as CharacterRecord[], collections: [] as CollectionRecord[] };
  if (!configured()) return empty;
  const supabase = createSupabasePublic();
  const [artworks, characters, collections] = await Promise.all([
    supabase
      .from("artworks")
      .select(`${ARTWORK_COLUMNS}, ${OWNER}`)
      .eq("owner.handle", handle)
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<ArtworkRow[]>(),
    supabase
      .from("characters")
      .select(`${CHARACTER_COLUMNS}, ${OWNER}`)
      .eq("owner.handle", handle)
      .order("position")
      .returns<CharacterRow[]>(),
    supabase
      .from("collections")
      .select(`${COLLECTION_COLUMNS}, ${OWNER}`)
      .eq("owner.handle", handle)
      .order("position")
      .returns<CollectionRow[]>(),
  ]);
  for (const { error } of [artworks, characters, collections]) {
    if (error && NOT_MIGRATED.has(error.code)) return empty;
    if (error) throw new Error(`Couldn't load @${handle}'s gallery: ${error.message}`);
  }

  return {
    pieces: (artworks.data ?? []).map((row) => toPiece(row, handle)),
    characters: (characters.data ?? []).map(
      (row): CharacterRecord => ({
        id: row.id,
        ownerHandle: handle,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        species: row.species,
        pronouns: row.pronouns,
        story: row.story,
        traits: row.traits,
        tags: row.tags,
        palette: row.palette,
        designer: row.designer ?? undefined,
        coverId: row.cover_artwork_id ?? undefined,
        art: row.character_art.map((a) => ({ artworkId: a.artwork_id, section: isSection(a.section) ? a.section : "art" })),
        adoptableId: row.adoptable_id ?? undefined,
        createdAt: row.created_at,
      }),
    ),
    collections: (collections.data ?? []).map(
      (row): CollectionRecord => ({
        id: row.id,
        ownerHandle: handle,
        slug: row.slug,
        title: row.title,
        description: row.description,
        coverId: row.cover_artwork_id ?? undefined,
        artworkIds: row.collection_art.map((a) => a.artwork_id),
        createdAt: row.created_at,
      }),
    ),
  };
}

/** Real characters by id, with their owner and cover: for favorites. */
export async function fetchCharactersByIds(ids: string[]) {
  if (!configured() || ids.length === 0) return [];
  const { data, error } = await createSupabasePublic()
    .from("characters")
    .select(
      `id, slug, name, species, palette, owner:profiles!inner(${ACCOUNT_COLUMNS}), cover:artworks!characters_cover_artwork_id_fkey(image, title)`,
    )
    .in("id", ids)
    .returns<
      {
        id: string;
        slug: string;
        name: string;
        species: string;
        palette: string[];
        owner: AccountRow;
        cover: { image: StoredImage; title: string } | null;
      }[]
    >();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load characters: ${error.message}`);
  return data;
}

/** Real artworks by id, with their owner: for favorites. */
export async function fetchArtworksByIds(ids: string[]) {
  if (!configured() || ids.length === 0) return [];
  const { data, error } = await createSupabasePublic()
    .from("artworks")
    .select(`${ARTWORK_COLUMNS}, owner:profiles!inner(${ACCOUNT_COLUMNS})`)
    .in("id", ids)
    .returns<(ArtworkRow & { owner: AccountRow })[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load artworks: ${error.message}`);
  return data;
}
