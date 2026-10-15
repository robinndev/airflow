import type { Change } from "./metrics.ts";

/*
 * Numbers and dates in the back office. Client-safe; fixed to en-US and UTC
 * so the server and the browser print the same thing.
 */

export type Unit = "count" | "usd" | "average";

const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

/** A value as people read it: 1,284 / 12.9K · $8.50 / $1,204 / $12.9K · 3.4 */
export function formatValue(n: number, unit: Unit = "count") {
  if (unit === "usd") {
    if (Math.abs(n) >= 10_000) return usdCompact.format(n);
    if (Math.abs(n) >= 1000 || Math.abs(n - Math.round(n)) < 0.005) return usd.format(n);
    return usdCents.format(n);
  }
  if (unit === "average") return Math.abs(n) < 10 ? oneDecimal.format(n) : int.format(n);
  return Math.abs(n) >= 10_000 ? compact.format(n) : int.format(n);
}

/** Axis ticks: always short. */
export function formatTick(n: number, unit: Unit = "count") {
  if (unit === "usd") return n === 0 ? "$0" : usdCompact.format(n);
  return Math.abs(n) >= 1000 ? compact.format(n) : oneDecimal.format(n);
}

export const formatPercent = (share: number) => `${Math.round(share * 100)}%`;

/** "+12%", "−8%", "new" (nothing before), "same". */
export function formatChange(change: Change) {
  if (change.direction === "flat") return "same";
  if (change.pct === null) return "new";
  const pct = Math.abs(change.pct);
  const digits = pct < 10 ? oneDecimal.format(pct) : int.format(pct);
  return `${change.direction === "up" ? "+" : "−"}${digits}%`;
}

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

const at = (day: string) => new Date(`${day}T12:00:00Z`);

/** "Oct 3" */
export const formatDay = (day: string) => short.format(at(day));
/** "Oct 3 – Oct 9, 2026" or "Fri, Oct 3, 2026" */
export const formatSpan = (start: string, end: string) =>
  start === end ? long.format(at(start)) : `${short.format(at(start))} – ${long.format(at(end)).replace(/^\w+, /, "")}`;
/** "19:12 UTC" */
export const formatClock = (iso: string) => `${time.format(new Date(iso))} UTC`;

/** "3h", "2 days" */
export function formatHours(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${oneDecimal.format(hours)}h`;
  return `${oneDecimal.format(hours / 24)} days`;
}
