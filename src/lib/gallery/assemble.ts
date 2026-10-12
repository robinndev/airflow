import type { Adoptable } from "@/lib/profile/types";
import {
  characterHref,
  characterPalette,
  collectionHref,
  isSection,
  type Character,
  type CharacterSection,
  type Collection,
  type Gallery,
  type Piece,
} from "./types";

/*
 * Turns stored rows (Supabase or the demo data, same shape) into the
 * gallery the pages show: pieces resolved, covers picked, adoptions linked.
 * Pure and client-safe.
 */

export type CharacterRecord = {
  id: string;
  ownerHandle: string;
  slug: string;
  name: string;
  tagline: string;
  species: string;
  pronouns: string;
  story: string;
  traits: string[];
  tags: string[];
  palette: string[];
  designer?: string;
  coverId?: string;
  art: { artworkId: string; section: CharacterSection }[];
  adoptableId?: string;
  createdAt: string;
};

export type CollectionRecord = {
  id: string;
  ownerHandle: string;
  slug: string;
  title: string;
  description: string;
  coverId?: string;
  artworkIds: string[];
  createdAt: string;
};

const newestFirst = (a: Piece, b: Piece) => b.createdAt.localeCompare(a.createdAt);

/** The cover first, then newest first. */
const coverFirst = (coverId: string | undefined) => (a: Piece, b: Piece) =>
  Number(b.id === coverId) - Number(a.id === coverId) || newestFirst(a, b);

export function assembleGallery(input: {
  pieces: Piece[];
  characters: CharacterRecord[];
  collections: CollectionRecord[];
  adoptables: Adoptable[];
}): Gallery {
  const pieces = input.pieces.toSorted(newestFirst);
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const adoptables = new Map(input.adoptables.map((a) => [a.id, a]));

  const characters = input.characters.map((record): Character => {
    const art = record.art
      .flatMap((a) => {
        const piece = byId.get(a.artworkId);
        return piece ? [{ piece, section: isSection(a.section) ? a.section : ("art" as const) }] : [];
      })
      .toSorted((a, b) => coverFirst(record.coverId)(a.piece, b.piece));
    const cover =
      (record.coverId && art.find((a) => a.piece.id === record.coverId)?.piece) ||
      art.find((a) => a.section === "design")?.piece ||
      art[0]?.piece;
    const adopt = record.adoptableId ? adoptables.get(record.adoptableId) : undefined;
    return {
      id: record.id,
      ownerHandle: record.ownerHandle,
      slug: record.slug,
      href: characterHref(record.ownerHandle, record.slug),
      name: record.name,
      tagline: record.tagline,
      species: record.species,
      pronouns: record.pronouns,
      story: record.story,
      traits: record.traits,
      tags: record.tags,
      palette: characterPalette(record.palette, cover?.image),
      ownPalette: record.palette,
      designer: record.designer,
      coverId: cover?.id,
      cover: cover?.image,
      art,
      adoptable: adopt && {
        id: adopt.id,
        priceUsd: adopt.priceUsd,
        status: adopt.status,
        href: `/${adopt.ownerHandle}/adoptables#${adopt.id}`,
      },
      createdAt: record.createdAt,
    };
  });

  const collections = input.collections.map((record): Collection => {
    const items = record.artworkIds
      .flatMap((id) => byId.get(id) ?? [])
      .toSorted(coverFirst(record.coverId));
    const cover = (record.coverId && items.find((p) => p.id === record.coverId)) || items[0];
    return {
      id: record.id,
      ownerHandle: record.ownerHandle,
      slug: record.slug,
      href: collectionHref(record.ownerHandle, record.slug),
      title: record.title,
      description: record.description,
      coverId: cover?.id,
      cover: cover?.image,
      pieces: items,
      createdAt: record.createdAt,
    };
  });

  return { pieces, characters, collections };
}

/** What the owner's dialogs need to know about the gallery (all of it public). */
export type GalleryIndex = {
  handle: string;
  ownerId: string;
  pieces: Record<string, Piece>;
  characters: Pick<Character, "id" | "name" | "slug" | "coverId" | "palette" | "ownPalette" | "tagline" | "species" | "pronouns" | "story" | "traits" | "tags" | "designer" | "href">[];
  collections: Pick<Collection, "id" | "title" | "description" | "coverId" | "href">[];
  /** Where each piece is shown. */
  places: Record<string, { characters: { id: string; section: CharacterSection }[]; collections: string[] }>;
  /** The owner's adoption listings, to link a character to. */
  adoptables: { id: string; name: string; status: Adoptable["status"] }[];
  /** Which adoptable each character points at. */
  adoptableOf: Record<string, string>;
};

export function galleryIndex(gallery: Gallery, input: { handle: string; ownerId: string; adoptables: Adoptable[] }): GalleryIndex {
  const places: GalleryIndex["places"] = {};
  const entry = (id: string) => (places[id] ??= { characters: [], collections: [] });
  for (const c of gallery.characters) for (const a of c.art) entry(a.piece.id).characters.push({ id: c.id, section: a.section });
  for (const c of gallery.collections) for (const p of c.pieces) entry(p.id).collections.push(c.id);
  return {
    handle: input.handle,
    ownerId: input.ownerId,
    pieces: Object.fromEntries(gallery.pieces.map((p) => [p.id, p])),
    characters: gallery.characters.map(({ id, name, slug, coverId, palette, ownPalette, tagline, species, pronouns, story, traits, tags, designer, href }) => ({
      id,
      name,
      slug,
      coverId,
      palette,
      ownPalette,
      tagline,
      species,
      pronouns,
      story,
      traits,
      tags,
      designer,
      href,
    })),
    collections: gallery.collections.map(({ id, title, description, coverId, href }) => ({ id, title, description, coverId, href })),
    places,
    adoptables: input.adoptables.map((a) => ({ id: a.id, name: a.name, status: a.status })),
    adoptableOf: Object.fromEntries(gallery.characters.flatMap((c) => (c.adoptable ? [[c.id, c.adoptable.id]] : []))),
  };
}

/** Which characters and collections each piece is on, for labels and the owner's menus. */
export function placesOf(gallery: Gallery) {
  const places = new Map<string, { characters: Character[]; collections: Collection[] }>();
  const entry = (id: string) => {
    let found = places.get(id);
    if (!found) places.set(id, (found = { characters: [], collections: [] }));
    return found;
  };
  for (const character of gallery.characters) for (const { piece } of character.art) entry(piece.id).characters.push(character);
  for (const collection of gallery.collections) for (const piece of collection.pieces) entry(piece.id).collections.push(collection);
  return places;
}
