import type { AdoptStatus } from "@/lib/listings/catalog";
import type { Artwork, ImageAsset } from "@/lib/profile/types";

/*
 * The gallery: everything an artist shows, organized three ways.
 *
 * - A piece (artwork) stands on its own: an illustration, a sketch, a ref.
 * - A character (OC) has a page of their own, with their art in sections.
 * - A collection groups pieces by theme or project.
 *
 * One piece can be on a character and in collections at the same time.
 * Client-safe. Limits mirror supabase/migrations/*_gallery.sql: change both.
 */

export const CHARACTER_SECTIONS = [
  { id: "design", label: "Design", hint: "The reference: how they look." },
  { id: "outfits", label: "Outfits", hint: "Other clothes, costumes, seasons." },
  { id: "expressions", label: "Expressions & poses", hint: "Moods, faces, how they move." },
  { id: "versions", label: "Alternate versions", hint: "AUs, other forms, redesigns." },
  { id: "art", label: "Art", hint: "Everything else they're in." },
] as const;

export type CharacterSection = (typeof CHARACTER_SECTIONS)[number]["id"];

/** The same ids as a tuple (for zod), in page order. */
export const SECTION_IDS = ["design", "outfits", "expressions", "versions", "art"] as const satisfies readonly CharacterSection[];
export const isSection = (value: unknown): value is CharacterSection => SECTION_IDS.includes(value as CharacterSection);
export const sectionLabel = (id: CharacterSection) => CHARACTER_SECTIONS.find((s) => s.id === id)?.label ?? "Art";

export const LIMITS = {
  title: 80,
  description: 2000,
  client: 40,
  tags: 12,
  tag: 30,
  name: 40,
  tagline: 120,
  species: 40,
  pronouns: 30,
  story: 6000,
  traits: 8,
  trait: 40,
  palette: 8,
  designer: 60,
  collectionTitle: 60,
  collectionDescription: 1000,
  /** Pieces added in one go from the Add art dialog. */
  batch: 12,
} as const;

/** A gallery piece: the profile's `Artwork`, plus what the gallery knows about it. */
export type Piece = Artwork & {
  description?: string;
  tags?: string[];
};

/** Where a character's adoption listing is, and how it stands. */
export type AdoptLink = {
  id: string;
  priceUsd: number;
  status: AdoptStatus;
  href: string;
};

export type Character = {
  id: string;
  ownerHandle: string;
  slug: string;
  href: string;
  name: string;
  tagline: string;
  species: string;
  pronouns: string;
  story: string;
  traits: string[];
  tags: string[];
  /** Their colors, as on a ref sheet: the artist's, or the cover's. */
  palette: string[];
  /** The colors the artist picked; empty means "take them from the cover". */
  ownPalette: string[];
  /** Who designed them, when it isn't the owner: `@handle` or a name. */
  designer?: string;
  /** The piece shown first; falls back to the first design piece. */
  coverId?: string;
  cover?: ImageAsset;
  /** Their art, newest first within each section. */
  art: { piece: Piece; section: CharacterSection }[];
  adoptable?: AdoptLink;
  createdAt: string;
};

export type Collection = {
  id: string;
  ownerHandle: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  coverId?: string;
  cover?: ImageAsset;
  /** Newest first. */
  pieces: Piece[];
  createdAt: string;
};

export type Gallery = {
  /** Every piece, newest first. */
  pieces: Piece[];
  /** In the artist's order. */
  characters: Character[];
  collections: Collection[];
};

export const characterHref = (handle: string, slug: string) => `/${handle}/characters/${slug}`;
export const collectionHref = (handle: string, slug: string) => `/${handle}/collections/${slug}`;

/** "Kinako's Winter coat!" → "kinako-s-winter-coat". Empty when nothing usable is left. */
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** The first slug from `base` that isn't taken: `luna`, `luna-2`, `luna-3`… */
export function uniqueSlug(base: string, taken: Iterable<string>, fallback = "untitled") {
  const used = new Set(taken);
  const root = slugify(base) || fallback;
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root.slice(0, 40 - String(n).length - 1)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Tags and traits as typed: trimmed, once each (ignoring case), within the limits. */
export function cleanList(values: readonly string[], max: number, maxLength: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length === max) break;
  }
  return out;
}

/** The character's pieces grouped by section, in section order, empty sections left out. */
export function sectionsOf(character: Pick<Character, "art">) {
  return CHARACTER_SECTIONS.flatMap((section) => {
    const pieces = character.art.filter((a) => a.section === section.id).map((a) => a.piece);
    return pieces.length ? [{ ...section, pieces }] : [];
  });
}

/** What a character's colors are: the artist's own, else the cover's. */
export function characterPalette(own: readonly string[], cover?: ImageAsset) {
  return own.length ? [...own] : (cover?.palette ?? []).slice(0, 6);
}
