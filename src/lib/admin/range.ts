/*
 * The back office's controls (/admin), kept in the URL: the period, whether
 * the team's own accounts count, and a "what if" platform fee. Pure and
 * client-safe. Days are UTC days, like the database's.
 */

export const RANGES = {
  "7d": { label: "7 days", short: "7d", days: 7 },
  "30d": { label: "30 days", short: "30d", days: 30 },
  "90d": { label: "90 days", short: "90d", days: 90 },
  "12m": { label: "12 months", short: "1y", days: 365 },
  all: { label: "All time", short: "All", days: null },
} as const;

export type RangeId = keyof typeof RANGES;
export const RANGE_ORDER = Object.keys(RANGES) as RangeId[];
export const DEFAULT_RANGE: RangeId = "30d";

/** The first real account (2026-10-10): "All time" starts here unless the database knows better. */
export const FIRST_DAY = "2026-10-10";

/** Fees to try on the receipt, besides the configured one. */
export const FEE_PRESETS = [4, 5, 6, 8, 10];
export const MAX_FEE = 30;

export type AdminQuery = {
  range: RangeId;
  /** Leave out the team's own accounts and the orders they're on. */
  withoutTeam: boolean;
  /** A fee to try instead of the configured one (percent), or null. */
  fee: number | null;
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseAdmin(params: Params): AdminQuery {
  const range = first(params.range);
  const fee = Number(first(params.fee));
  return {
    range: range && range in RANGES ? (range as RangeId) : DEFAULT_RANGE,
    withoutTeam: first(params.team) === "out",
    // Half points at most, so a typo can't produce a fee nobody would charge.
    fee: first(params.fee) && Number.isFinite(fee) && fee >= 0 && fee <= MAX_FEE ? Math.round(fee * 2) / 2 : null,
  };
}

/** The URL for the current query with some of it changed. Defaults stay out of the URL. */
export function adminHref(query: AdminQuery, patch: Partial<AdminQuery> = {}) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.range !== DEFAULT_RANGE) params.set("range", next.range);
  if (next.withoutTeam) params.set("team", "out");
  if (next.fee !== null) params.set("fee", String(next.fee));
  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

const DAY = 86_400_000;

/** "2026-10-15" plus or minus whole days. */
export const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** Whole days from one day to another (same day = 0). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

export type Window = {
  /** First and last day of the period, inclusive. */
  from: string;
  to: string;
  /** Where the daily series start: the period before, the same length, when there is one. */
  seriesFrom: string;
  days: number;
  /** Whether there's a previous period to compare with. */
  compare: boolean;
};

/** `firstDay`: the day the oldest account was made ("All time" starts there). */
export function windowOf(range: RangeId, today: string, firstDay = FIRST_DAY): Window {
  const length = RANGES[range].days;
  if (length === null) {
    const from = firstDay < today ? firstDay : today;
    return { from, to: today, seriesFrom: from, days: daysBetween(from, today) + 1, compare: false };
  }
  const from = addDays(today, -(length - 1));
  return { from, to: today, seriesFrom: addDays(from, -length), days: length, compare: true };
}

/** Daily points up to about three months; weekly beyond, so columns stay readable. */
export const bucketDaysOf = (days: number) => (days <= 92 ? 1 : 7);
