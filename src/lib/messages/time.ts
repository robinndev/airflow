/*
 * Times in the viewer's own clock. Messages render only in the browser
 * (after the inbox or a conversation loads), so local time zones are safe here.
 */

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDay = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const DAY = 86_400_000;

/** "3:12 PM" */
export const clockTime = (iso: string) => time.format(new Date(iso));

/** Inbox: "now", "12m", "3:12 PM", "Mon", "Oct 9". */
export function inboxTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days === 0) return time.format(date);
  if (days < 7) return weekday.format(date);
  return monthDay.format(date);
}

/** Same calendar day in the viewer's clock. */
export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b));

/** What a day's postmark says: "Today", "Mon", "Oct 9" (plus the year when it isn't this one); `label` spells it out. */
export function postmarkDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  const label = fullDay.format(date);
  if (days === 0) return { day: "Today", label: `Today, ${label}` };
  if (days === 1) return { day: weekday.format(date), label: `Yesterday, ${label}` };
  if (days < 7) return { day: weekday.format(date), label };
  return {
    day: monthDay.format(date),
    year: date.getFullYear() === now.getFullYear() ? undefined : String(date.getFullYear()),
    label,
  };
}
