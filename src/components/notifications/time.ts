/*
 * Dates in the viewer's own clock. The guest book renders only in the
 * browser (after it loads), so local time zones are safe here.
 */

const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayDay = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const monthDayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const DAY = 86_400_000;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const daysAgo = (iso: string, now: Date) => Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY);

/** A day's stamp: "Today", "Yesterday", "Mon, Oct 6", "Sep 2", "Sep 2, 2025". */
export function dayStamp(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = daysAgo(iso, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return weekdayDay.format(date);
  return date.getFullYear() === now.getFullYear() ? monthDay.format(date) : monthDayYear.format(date);
}

/** Within its day: "now", "12m", "3h" today; the clock time on older days. */
export function noteTime(iso: string, now = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (daysAgo(iso, now) > 0) return clock.format(new Date(iso));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

/** "October 2026", for the bookplate (a bare date counts from midday, so no time zone moves it to another month). */
export const sinceMonth = (iso: string) => monthYear.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
