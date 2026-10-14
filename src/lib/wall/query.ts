import type { FavoriteKind } from "@/lib/favorites/keys";
import { MOODS, type MoodSlug } from "../palette.ts";
import type { ImageAsset } from "@/lib/profile/types";
import { relevance, terms, trendScore } from "../search/query.ts";

/*
 * Explore's wall: every picture on Artiflow (gallery pieces, posts,
 * characters, adoptables, commission examples), one tile per artwork. Pure
 * and client-safe; src/lib/wall/catalog.ts builds the entries on the server
 * and the page filters them per request. The URL is the state, so a wall can
 * be shared: /explore?show=characters&color=tidepool&q=fox.
 */

/** Where a tile comes from, and so what opening it leads to. */
export type WallKind = "piece" | "post" | "character" | "adoptable" | "commission";
/** The wall's index tabs. Art = pieces, posts and commission examples. */
export type WallShow = "all" | "art" | "characters" | "adoptables";
/** "mix" is the default: fresh and liked pieces, artists spread out. */
export type WallSort = "mix" | "trending" | "new" | "shuffle";

export type WallArtist = { handle: string; name: string; avatar: ImageAsset; href: string };

export type WallItem = {
  /** Unique on the wall: `<kind>:<source id>`. */
  id: string;
  kind: WallKind;
  title: string;
  /** A character's species, a commission's category. */
  subtitle?: string;
  /** The cover first, then the rest of the set (a post's pictures, a service's examples, a character's art). */
  images: ImageAsset[];
  artist: WallArtist;
  /** The thing's own page. */
  href: string;
  moods: MoodSlug[];
  likes: number;
  createdAt: string;
  /** Posts: an unfinished stage. */
  stage?: "wip" | "sketch";
  /** Adoptables: the price. Commissions: the cheapest package. */
  priceUsd?: number;
  status?: "available" | "reserved" | "adopted";
  /** The artist takes commissions right now, from this price. */
  openFromUsd?: number;
  /** What the heart saves to the moodboard; absent when there's nothing to save. */
  save?: { kind: FavoriteKind; id: string };
};

/** A tile plus what search reads but the browser never needs. */
export type WallEntry = {
  item: WallItem;
  /** Tags, species, category, style: weighed after the title and the artist. */
  tags: string;
  /** Alt text, descriptions, captions: weighed least. */
  text: string;
};

export type WallParams = {
  q: string;
  show: WallShow;
  color?: MoodSlug;
  /** Only artists taking commissions now. */
  open: boolean;
  sort: WallSort;
  /** Shuffle's seed, so a shuffled wall can be shared (and paged) as it is. */
  seed: number;
};

export const WALL_PAGE = 60;

/** The wall's cache tag. Gallery writes invalidate it (they touch neither the feed nor listings). */
export const WALL_TAG = "explore-wall";

const SHOWS: WallShow[] = ["all", "art", "characters", "adoptables"];
const SORTS: WallSort[] = ["mix", "trending", "new", "shuffle"];

type RawParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function parseWall(raw: RawParams): WallParams {
  const color = MOODS.find((m) => m.slug === one(raw.color))?.slug;
  const seed = Math.trunc(Number(one(raw.seed)));
  return {
    q: one(raw.q).trim().slice(0, 80),
    show: SHOWS.find((s) => s === one(raw.show)) ?? "all",
    ...(color && { color }),
    open: one(raw.open) === "1",
    sort: SORTS.find((s) => s === one(raw.sort)) ?? "mix",
    seed: Number.isFinite(seed) && seed > 0 ? seed % 1_000_000 : 1,
  };
}

/** The query string for a wall (no `?`), with `changes` applied; defaults are left out so links stay short. */
export function wallQuery(params: WallParams, changes: Partial<WallParams> = {}) {
  const next = { ...params, ...changes };
  const out = new URLSearchParams();
  if (next.q) out.set("q", next.q);
  if (next.show !== "all") out.set("show", next.show);
  if (next.color) out.set("color", next.color);
  if (next.open) out.set("open", "1");
  if (next.sort !== "mix") out.set("sort", next.sort);
  if (next.sort === "shuffle") out.set("seed", String(next.seed));
  return out.toString();
}

export function wallHref(params: WallParams, changes: Partial<WallParams> = {}) {
  const query = wallQuery(params, changes);
  return `/explore${query ? `?${query}` : ""}`;
}

/* ---------------------------------------------------------------- filters */

const SHOWN: Record<WallShow, (kind: WallKind) => boolean> = {
  all: () => true,
  art: (kind) => kind === "piece" || kind === "post" || kind === "commission",
  characters: (kind) => kind === "character",
  adoptables: (kind) => kind === "adoptable",
};

/** Everything but the tab, so each tab can count what it would show. */
function matchesFilters(entry: WallEntry, p: WallParams) {
  if (p.color && !entry.item.moods.includes(p.color)) return false;
  if (p.open && entry.item.openFromUsd === undefined) return false;
  return true;
}

function fieldsOf({ item, tags, text }: WallEntry) {
  return [
    { weight: 4, text: `${item.title} ${item.subtitle ?? ""}` },
    { weight: 3, text: `${item.artist.name} ${item.artist.handle}` },
    { weight: 2, text: `${tags} ${KIND_WORDS[item.kind]}` },
    { weight: 1, text },
  ];
}

/** So "adoptable", "character" or "commission" in the box finds those tiles. */
const KIND_WORDS: Record<WallKind, string> = {
  piece: "art",
  post: "post art",
  character: "character oc",
  adoptable: "adoptable adopt",
  commission: "commission example",
};

/* ------------------------------------------------------------------ order */

/** Stable pseudo-random number in [0, 1) per key, so every render agrees. */
export function noise(key: string) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

function shuffled<T extends { item: WallItem }>(list: T[], seed: number) {
  return list
    .map((entry) => ({ entry, r: noise(`${seed}:${entry.item.id}`) }))
    .toSorted((a, b) => a.r - b.r)
    .map(({ entry }) => entry);
}

/**
 * Keeps one artist from filling a row: each tile is the first one (in the
 * order given) whose artist isn't among the last `gap` placed, looking a
 * little ahead. The order otherwise stays as it was.
 */
export function spreadArtists<T extends { item: WallItem }>(list: T[], gap = 3, lookahead = 24): T[] {
  const rest = [...list];
  const out: T[] = [];
  while (rest.length) {
    const recent = new Set(out.slice(-gap).map((e) => e.item.artist.handle));
    const window = Math.min(lookahead, rest.length);
    let pick = 0;
    for (let i = 0; i < window; i++) {
      if (!recent.has(rest[i].item.artist.handle)) {
        pick = i;
        break;
      }
    }
    out.push(rest.splice(pick, 1)[0]);
  }
  return out;
}

const DAY = 86_400_000;

/**
 * Filters and orders the wall. Mix: likes weighed down by age, with some
 * jitter so the wall changes as it fills, and artists spread out. Trending:
 * likes weighed down by age. New: newest first. Shuffle: seeded. A query
 * ranks by how well it matches first.
 */
export function runWall<T extends WallEntry>(entries: readonly T[], p: WallParams, now: number): T[] {
  const qTerms = terms(p.q);
  const age = (iso: string) => Math.max(0, (now - new Date(iso).getTime()) / DAY);
  const trend = (item: WallItem) => trendScore(item.likes + 1, age(item.createdAt));

  const scored = entries
    .filter((entry) => SHOWN[p.show](entry.item.kind) && matchesFilters(entry, p))
    .map((entry) => ({ entry, score: qTerms.length ? relevance(fieldsOf(entry), qTerms) : 1 }))
    .filter((r) => r.score > 0);

  const byNew = (a: T, b: T) => b.item.createdAt.localeCompare(a.item.createdAt);
  if (p.sort === "shuffle") return shuffled(scored.map((r) => r.entry), p.seed);
  if (p.sort === "new") return scored.map((r) => r.entry).toSorted(byNew);
  if (p.sort === "trending") {
    return scored.toSorted((a, b) => b.score - a.score || trend(b.entry.item) - trend(a.entry.item)).map((r) => r.entry);
  }
  const mixed = scored
    .map((r) => ({ ...r, weight: trend(r.entry.item) * (0.35 + noise(r.entry.item.id) * 1.3) }))
    .toSorted((a, b) => b.score - a.score || b.weight - a.weight)
    .map((r) => r.entry);
  return spreadArtists(mixed);
}

/** How many tiles each tab would show with the rest of the filters (and the query) as they are. */
export function wallCounts(entries: readonly WallEntry[], p: WallParams): Record<WallShow, number> {
  const qTerms = terms(p.q);
  const counts: Record<WallShow, number> = { all: 0, art: 0, characters: 0, adoptables: 0 };
  for (const entry of entries) {
    if (!matchesFilters(entry, p)) continue;
    if (qTerms.length && relevance(fieldsOf(entry), qTerms) === 0) continue;
    for (const show of SHOWS) if (SHOWN[show](entry.item.kind)) counts[show]++;
  }
  return counts;
}

/** What narrowed the wall, so an empty one can offer to undo each. */
export function wallFilters(p: WallParams): ("q" | "show" | "color" | "open")[] {
  return [
    ...(p.q ? (["q"] as const) : []),
    ...(p.show !== "all" ? (["show"] as const) : []),
    ...(p.color ? (["color"] as const) : []),
    ...(p.open ? (["open"] as const) : []),
  ];
}
