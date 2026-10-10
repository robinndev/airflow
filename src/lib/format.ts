const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Fixed UTC so server and client always agree (no hydration mismatch).
const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

const day = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });
const dayShort = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatCompact = (n: number) => compact.format(n);
export const formatUsd = (n: number) => usd.format(n);
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));
export const formatLongDate = (iso: string) => longDate.format(new Date(iso));
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso));
/** "October 10, 2026" */
export const formatDay = (iso: string) => day.format(new Date(iso));
/** "Oct 10, 2026" */
export const formatDayShort = (iso: string) => dayShort.format(new Date(iso));
