/*
 * What artists sell, and the words discovery filters by. Two kinds of
 * listing, bought in different ways:
 *
 * - Made to order (commission services): the buyer requests, the artist
 *   reviews and quotes, the buyer pays, then the piece is drawn. A service
 *   has packages (sketch → lineart → full color), a turnaround, slots and its
 *   own status (open / waitlist / closed).
 * - Ready-made (adoptables): the character is already drawn. Fixed price,
 *   available → reserved → sold; whoever pays first owns it.
 *
 * Client-safe and pure. The lists mirror the check constraints in
 * supabase/migrations/*_listings.sql: change both together.
 */

export const SERVICE_CATEGORIES = [
  { id: "illustration", label: "Illustration" },
  { id: "character-design", label: "Character design" },
  { id: "icons", label: "Icons & portraits" },
  { id: "ref-sheets", label: "Ref sheets" },
  { id: "chibi", label: "Chibi" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "emotes", label: "Emotes & badges" },
  { id: "pixel-art", label: "Pixel art" },
  { id: "comics", label: "Comics" },
  { id: "animation", label: "Animation" },
  { id: "other", label: "Something else" },
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]["id"];

export const SERVICE_CATEGORY_IDS = SERVICE_CATEGORIES.map((c) => c.id) as ServiceCategory[];
export const isServiceCategory = (value: unknown): value is ServiceCategory =>
  SERVICE_CATEGORY_IDS.includes(value as ServiceCategory);
export const categoryLabel = (id: ServiceCategory) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label ?? "Commission";

/** How a piece looks. A service picks up to four. */
export const STYLES = [
  { id: "anime", label: "Anime" },
  { id: "semi_realistic", label: "Semi-realistic" },
  { id: "realistic", label: "Realistic" },
  { id: "cartoon", label: "Cartoon" },
  { id: "painterly", label: "Painterly" },
  { id: "cel_shaded", label: "Cel-shaded" },
  { id: "traditional", label: "Traditional media" },
  { id: "pixel", label: "Pixel" },
  { id: "sketchy", label: "Sketchy" },
] as const;

export type StyleTag = (typeof STYLES)[number]["id"];

export const STYLE_IDS = STYLES.map((s) => s.id) as StyleTag[];
export const MAX_STYLES = 4;
export const isStyleTag = (value: unknown): value is StyleTag => STYLE_IDS.includes(value as StyleTag);
export const styleLabel = (id: StyleTag) => STYLES.find((s) => s.id === id)?.label ?? id;

/** Known styles only, once each, in catalog order. */
export const cleanStyles = (values: readonly unknown[]) => STYLE_IDS.filter((id) => values.includes(id)).slice(0, MAX_STYLES);

/* ----------------------------------------------------------------- limits */

export const LIMITS = {
  services: 20,
  adoptables: 100,
  packages: 4,
  examples: 6,
  adoptImages: 4,
  addons: 8,
  includes: 8,
  /** Most slots a service can hold. */
  slots: 99,
  priceUsd: { min: 1, max: 10_000 },
  turnaroundDays: { min: 1, max: 365 },
} as const;

/* ------------------------------------------------------------- turnaround */

/** Days a turnaround unit stands for. A month is 30 days (12 fit in the 365-day cap). */
export type TurnaroundUnit = 1 | 7 | 30;

/**
 * The unit a turnaround reads in: months when both ends are whole months,
 * else weeks when both are whole weeks, else days. The editor stores what the
 * artist typed in that unit, so it reads back the same way.
 */
export function turnaroundUnit({ min, max }: { min: number; max: number }): TurnaroundUnit {
  if (min % 30 === 0 && max % 30 === 0) return 30;
  if (min % 7 === 0 && max % 7 === 0) return 7;
  return 1;
}

/** "5 days", "5–7 days", "1–2 weeks", "3 weeks", "1 month", "2–4 months". */
export function turnaroundLabel({ min, max }: { min: number; max: number }) {
  const step = turnaroundUnit({ min, max });
  const name = step === 30 ? "month" : step === 7 ? "week" : "day";
  const [a, b] = [Math.round(min / step), Math.round(max / step)];
  if (a === b) return `${a} ${name}${a === 1 ? "" : "s"}`;
  return `${a}–${b} ${name}s`;
}

/** Turnaround filters, by the longest the artist promises. */
export const TURNAROUND_FILTERS = [
  { id: "week", label: "Within a week", maxDays: 7 },
  { id: "2weeks", label: "Within 2 weeks", maxDays: 14 },
  { id: "month", label: "Within a month", maxDays: 31 },
] as const;

export type TurnaroundFilter = (typeof TURNAROUND_FILTERS)[number]["id"];

/* ---------------------------------------------------------------- packages */

/** A step of the same piece: each package says what you get at its price. */
export type PackageDraft = { id: string; label: string; priceUsd: number; includes: string[] };

/** The usual ladder artists post on a commission sheet; the editor starts from it. */
export const PACKAGE_PRESETS: { label: string; includes: string[]; share: number }[] = [
  { label: "Sketch", includes: ["Clean sketch", "Flat gray"], share: 0.4 },
  { label: "Lineart", includes: ["Clean lineart", "Flat colors"], share: 0.65 },
  { label: "Full color", includes: ["Lineart", "Full shading", "Simple background"], share: 1 },
];

/** Cheapest package first; the "from" price is the first one's. */
export const sortPackages = <T extends { priceUsd: number }>(packages: readonly T[]) =>
  packages.toSorted((a, b) => a.priceUsd - b.priceUsd);

export const priceFrom = (packages: readonly { priceUsd: number }[]) =>
  packages.length ? Math.min(...packages.map((p) => p.priceUsd)) : 0;

/* ------------------------------------------------------------ adoptables */

export type AdoptStatus = "available" | "reserved" | "sold";

export const ADOPT_STATUS: Record<AdoptStatus, { label: string; hint: string }> = {
  available: { label: "Available", hint: "Anyone can adopt it" },
  reserved: { label: "On hold", hint: "Promised to someone, not paid yet" },
  sold: { label: "Adopted", hint: "It has a new owner" },
};

/** What adoptables usually come with; the editor offers these as one-tap chips. */
export const ADOPT_INCLUDES = [
  "Full ref sheet",
  "Transparent PNG",
  "Layered file",
  "Commercial rights",
  "Name & lore ideas",
  "Free color edit",
];

/** And what a commission package usually lists. */
export const SERVICE_INCLUDES = [
  "1 character",
  "Simple background",
  "Painted background",
  "Transparent PNG",
  "2 revisions",
  "High-res file",
  "Process timelapse",
  "Commercial use",
];
