import type { DrawTag } from "@/lib/profile/draws";
import type { CommissionStatus, ImageAsset, ServicePackage } from "@/lib/profile/types";
import type { AdoptStatus, ServiceCategory, StyleTag, TurnaroundFilter } from "@/lib/listings/catalog";

/*
 * Search over what's listed: commission services, adoptables and artists.
 * Plain rules, no ranking model (the MVP brief: relevance, recent, popular).
 * Everything here is pure and client-safe; src/lib/search/catalog.ts builds
 * the hits on the server and the page filters them per request. The URL is
 * the state: every filter is a search param, so results can be shared.
 */

export type SearchType = "commissions" | "adoptables" | "artists";
export type SearchSort = "relevance" | "recent" | "popular";
/** Commissions: open now, open or waitlist, anything. Adoptables: available, or anything. */
export type Availability = "open" | "waitlist" | "all";

export type ArtistLite = { handle: string; name: string; avatar: ImageAsset; isPro?: boolean; href: string };

export type ServiceHit = {
  kind: "service";
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  styles: StyleTag[];
  /** Who the artist draws (their profile's subjects and specialties). */
  draws: DrawTag[];
  artist: ArtistLite;
  priceFromUsd: number;
  /** The most a package costs (the price range a buyer can land in). */
  priceToUsd: number;
  packages?: ServicePackage[];
  turnaround: string;
  turnaroundDays: { min: number; max: number };
  /** "soon": closed now, opening at `opensAt`. */
  status: CommissionStatus | "soon";
  opensAt?: string;
  slots: { total: number; taken: number } | null;
  examples: ImageAsset[];
  createdAt: string;
  popularity: number;
  href: string;
};

export type AdoptHit = {
  kind: "adoptable";
  id: string;
  name: string;
  species: string;
  description: string;
  draws: DrawTag[];
  artist: ArtistLite;
  priceUsd: number;
  status: AdoptStatus;
  image: ImageAsset;
  createdAt: string;
  popularity: number;
  href: string;
};

export type ArtistHit = {
  kind: "artist";
  handle: string;
  name: string;
  headline: string;
  avatar: ImageAsset;
  banner?: ImageAsset;
  draws: DrawTag[];
  /** Union of their services' styles and categories. */
  styles: StyleTag[];
  categories: ServiceCategory[];
  commissions: CommissionStatus;
  fromUsd?: number;
  /** Quickest turnaround among services that take requests. */
  turnaroundMaxDays?: number;
  followers: number;
  isPro?: boolean;
  createdAt: string;
  popularity: number;
  href: string;
};

export type SearchCatalog = { services: ServiceHit[]; adoptables: AdoptHit[]; artists: ArtistHit[] };

export type SearchParams = {
  q: string;
  type: SearchType;
  sort: SearchSort;
  availability: Availability;
  category?: ServiceCategory;
  styles: StyleTag[];
  draws: DrawTag[];
  minUsd?: number;
  maxUsd?: number;
  turnaround?: TurnaroundFilter;
  /** How many results to show (Show more adds a page). */
  limit: number;
};

export const PAGE_SIZE = 24;

const TYPES: SearchType[] = ["commissions", "adoptables", "artists"];
const SORTS: SearchSort[] = ["relevance", "recent", "popular"];
const TURNAROUND_DAYS: Record<TurnaroundFilter, number> = { week: 7, "2weeks": 14, month: 31 };

/** Search params as Next hands them over (string | string[] | undefined). */
type RawParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const list = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : [value ?? ""]).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
const money = (value: string) => {
  const n = Number(value);
  return value !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

/**
 * Reads the URL into a search. `known` lists the valid categories, styles and
 * draw tags (passed in so this file has no runtime imports); unknown values
 * are dropped.
 */
export function parseSearch(
  raw: RawParams,
  known: { categories: readonly string[]; styles: readonly string[]; draws: readonly string[] },
  defaults: Partial<Pick<SearchParams, "type" | "sort">> = {},
): SearchParams {
  const type = TYPES.find((t) => t === one(raw.type)) ?? defaults.type ?? "commissions";
  const sort = SORTS.find((s) => s === one(raw.sort)) ?? defaults.sort ?? "relevance";
  const availability = (["open", "waitlist", "all"] as const).find((a) => a === one(raw.avail)) ?? (type === "artists" ? "all" : "open");
  const category = known.categories.find((c) => c === one(raw.category)) as ServiceCategory | undefined;
  const turnaround = (Object.keys(TURNAROUND_DAYS) as TurnaroundFilter[]).find((t) => t === one(raw.turnaround));
  let minUsd = money(one(raw.min));
  let maxUsd = money(one(raw.max));
  if (minUsd !== undefined && maxUsd !== undefined && minUsd > maxUsd) [minUsd, maxUsd] = [maxUsd, minUsd];
  const pages = Math.min(10, Math.max(1, Math.round(Number(one(raw.page)) || 1)));
  return {
    q: one(raw.q).trim().slice(0, 80),
    type,
    sort,
    availability,
    ...(category && { category }),
    styles: list(raw.style).filter((s) => known.styles.includes(s)) as StyleTag[],
    draws: list(raw.draws).filter((d) => known.draws.includes(d)) as DrawTag[],
    ...(minUsd !== undefined && { minUsd }),
    ...(maxUsd !== undefined && { maxUsd }),
    ...(turnaround && { turnaround }),
    limit: pages * PAGE_SIZE,
  };
}

/** The URL for a search, with `changes` applied; defaults are left out so links stay short. */
export function searchHref(params: SearchParams, changes: Partial<SearchParams> & { page?: number } = {}) {
  const next = { ...params, ...changes };
  const out = new URLSearchParams();
  if (next.q) out.set("q", next.q);
  if (next.type !== "commissions") out.set("type", next.type);
  if (next.category) out.set("category", next.category);
  if (next.styles.length) out.set("style", next.styles.join(","));
  if (next.draws.length) out.set("draws", next.draws.join(","));
  if (next.minUsd !== undefined) out.set("min", String(next.minUsd));
  if (next.maxUsd !== undefined) out.set("max", String(next.maxUsd));
  if (next.turnaround) out.set("turnaround", next.turnaround);
  const defaultAvailability = next.type === "artists" ? "all" : "open";
  if (next.availability !== defaultAvailability) out.set("avail", next.availability);
  if (next.sort !== "relevance") out.set("sort", next.sort);
  if (changes.page && changes.page > 1) out.set("page", String(changes.page));
  const query = out.toString();
  return `/explore/search${query ? `?${query}` : ""}`;
}

/* ------------------------------------------------------------- relevance */

/** Lowercase words, without accents, "@" or "#". */
export function terms(q: string) {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s,]+/)
    .map((t) => t.replace(/^[@#]+/, "").replace(/[^a-z0-9._-]/g, ""))
    .filter((t) => t.length > 0);
}

const words = (text: string) => terms(text);

/**
 * How well one term matches a field: the whole word (3), the start of a word
 * (2), anywhere inside (1), or not at all (0). Short terms only match word
 * starts, so "a" doesn't match everything.
 */
function fieldScore(term: string, text: string) {
  const ws = words(text);
  if (ws.includes(term)) return 3;
  if (ws.some((w) => w.startsWith(term))) return 2;
  if (term.length >= 3 && text.toLowerCase().includes(term)) return 1;
  return 0;
}

/**
 * Every term has to match somewhere (AND); the score adds up each term's best
 * field, weighted: the listing's name counts most, then the artist, then
 * tags, then the description. 0 = not a match.
 */
export function relevance(fields: { weight: number; text: string }[], qTerms: string[]) {
  let total = 0;
  for (const term of qTerms) {
    let best = 0;
    for (const field of fields) best = Math.max(best, fieldScore(term, field.text) * field.weight);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/* --------------------------------------------------------------- filters */

const hasAll = <T>(have: readonly T[], want: readonly T[]) => want.every((w) => have.includes(w));
const hasAny = <T>(have: readonly T[], want: readonly T[]) => want.length === 0 || want.some((w) => have.includes(w));

/** A price range overlaps [min, max]. */
const inPrice = (from: number, to: number, p: SearchParams) =>
  (p.maxUsd === undefined || from <= p.maxUsd) && (p.minUsd === undefined || to >= p.minUsd);

export function serviceMatches(hit: ServiceHit, p: SearchParams) {
  if (p.availability === "open" && !(hit.status === "open" && (!hit.slots || hit.slots.taken < hit.slots.total))) return false;
  if (p.availability === "waitlist" && hit.status !== "open" && hit.status !== "waitlist") return false;
  if (p.category && hit.category !== p.category) return false;
  if (!hasAll(hit.styles, p.styles)) return false;
  if (!hasAny(hit.draws, p.draws)) return false;
  if (!inPrice(hit.priceFromUsd, hit.priceToUsd, p)) return false;
  if (p.turnaround && hit.turnaroundDays.max > TURNAROUND_DAYS[p.turnaround]) return false;
  return true;
}

export function adoptMatches(hit: AdoptHit, p: SearchParams) {
  if (p.availability !== "all" && hit.status !== "available") return false;
  if (!hasAny(hit.draws, p.draws)) return false;
  if (!inPrice(hit.priceUsd, hit.priceUsd, p)) return false;
  return true;
}

export function artistMatches(hit: ArtistHit, p: SearchParams) {
  if (p.availability === "open" && hit.commissions !== "open") return false;
  if (p.availability === "waitlist" && hit.commissions === "closed") return false;
  if (p.category && !hit.categories.includes(p.category)) return false;
  if (!hasAll(hit.styles, p.styles)) return false;
  if (!hasAny(hit.draws, p.draws)) return false;
  if ((p.minUsd !== undefined || p.maxUsd !== undefined) && (hit.fromUsd === undefined || !inPrice(hit.fromUsd, hit.fromUsd, p))) return false;
  if (p.turnaround && (hit.turnaroundMaxDays === undefined || hit.turnaroundMaxDays > TURNAROUND_DAYS[p.turnaround])) return false;
  return true;
}

type Labels = { category: (id: ServiceCategory) => string; style: (id: StyleTag) => string; draw: (id: DrawTag) => string };

function fieldsOf(hit: ServiceHit | AdoptHit | ArtistHit, labels: Labels) {
  const tags = (styles: StyleTag[], draws: DrawTag[]) => [...styles.map(labels.style), ...draws.map(labels.draw)].join(" ");
  switch (hit.kind) {
    case "service":
      return [
        { weight: 4, text: hit.title },
        { weight: 3, text: `${hit.artist.name} ${hit.artist.handle}` },
        { weight: 2, text: `${labels.category(hit.category)} ${tags(hit.styles, hit.draws)} ${(hit.packages ?? []).map((p) => p.label).join(" ")}` },
        { weight: 1, text: hit.description },
      ];
    case "adoptable":
      return [
        { weight: 4, text: `${hit.name} ${hit.species}` },
        { weight: 3, text: `${hit.artist.name} ${hit.artist.handle}` },
        { weight: 2, text: `adoptable adopt ${tags([], hit.draws)}` },
        { weight: 1, text: hit.description },
      ];
    case "artist":
      return [
        { weight: 4, text: `${hit.name} ${hit.handle}` },
        { weight: 2, text: `${hit.categories.map(labels.category).join(" ")} ${tags(hit.styles, hit.draws)}` },
        { weight: 1, text: hit.headline },
      ];
  }
}

const AVAILABLE_FIRST: Record<string, number> = { open: 0, available: 0, waitlist: 1, soon: 2, reserved: 2, closed: 3, sold: 3 };
const availabilityOf = (hit: ServiceHit | AdoptHit | ArtistHit) =>
  AVAILABLE_FIRST[hit.kind === "service" || hit.kind === "adoptable" ? hit.status : hit.commissions] ?? 3;

/**
 * Filters and orders one kind of hit. Relevance: best match first (with no
 * query: what you can buy now, then popularity). Recent: newest listing.
 * Popular: most followed / liked / reviewed.
 */
export function runSearch<T extends ServiceHit | AdoptHit | ArtistHit>(
  hits: readonly T[],
  p: SearchParams,
  matches: (hit: T, p: SearchParams) => boolean,
  labels: Labels,
): T[] {
  const qTerms = terms(p.q);
  const scored = hits
    .filter((hit) => matches(hit, p))
    .map((hit) => ({ hit, score: qTerms.length ? relevance(fieldsOf(hit, labels), qTerms) : 1 }))
    .filter((r) => r.score > 0);

  const byPopularity = (a: { hit: T }, b: { hit: T }) => b.hit.popularity - a.hit.popularity;
  const byRecent = (a: { hit: T }, b: { hit: T }) => b.hit.createdAt.localeCompare(a.hit.createdAt);
  scored.sort((a, b) => {
    if (p.sort === "recent") return byRecent(a, b) || byPopularity(a, b);
    if (p.sort === "popular") return byPopularity(a, b) || byRecent(a, b);
    return b.score - a.score || availabilityOf(a.hit) - availabilityOf(b.hit) || byPopularity(a, b);
  });
  return scored.map((r) => r.hit);
}

/** What the filters narrowed away, so an empty page can offer to undo each one. */
export function activeFilters(p: SearchParams): (keyof SearchParams)[] {
  const out: (keyof SearchParams)[] = [];
  if (p.category) out.push("category");
  if (p.styles.length) out.push("styles");
  if (p.draws.length) out.push("draws");
  if (p.minUsd !== undefined || p.maxUsd !== undefined) out.push("minUsd");
  if (p.turnaround) out.push("turnaround");
  if (p.availability !== (p.type === "artists" ? "all" : "open")) out.push("availability");
  return out;
}

/** Simple trending: likes, weighed down by age (Hacker News-style gravity). */
export function trendScore(likes: number, ageDays: number) {
  return likes / Math.pow(Math.max(0, ageDays) + 2, 1.4);
}
