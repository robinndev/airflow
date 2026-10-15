/*
 * Local time on profiles (client-safe). Artists choose to show it in
 * Settings → Privacy; `profiles.time_zone` holds the zone only while it's
 * shown. Visitors see the artist's clock and how far it is from their own.
 */

/** A zone the browser knows ("America/Sao_Paulo", "UTC"). */
export function isTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone.length > 64 || !/^[A-Za-z]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** "3:42 pm" in that zone. */
export function clockIn(zone: string, now: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })
    .format(now)
    .replace(" AM", " am")
    .replace(" PM", " pm");
}

/** Minutes the zone is ahead of UTC at that moment (negative: behind). */
export function offsetMinutes(zone: string, now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(now)
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const utcMinute = Math.floor(now.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - utcMinute) / 60_000);
}

/** "5h ahead of you", "2h 30m behind you", "same time as you". */
export function differenceLabel(zone: string, viewerZone: string, now: Date) {
  const minutes = offsetMinutes(zone, now) - offsetMinutes(viewerZone, now);
  if (minutes === 0) return "same time as you";
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  const span = [hours && `${hours}h`, rest && `${rest}m`].filter(Boolean).join(" ");
  return `${span} ${minutes > 0 ? "ahead of" : "behind"} you`;
}

/** "America/Sao_Paulo" → "Sao Paulo (America)": how the zone list reads. */
export function zoneLabel(zone: string) {
  const parts = zone.split("/");
  const city = parts.at(-1)!.replaceAll("_", " ");
  return parts.length > 1 ? `${city} (${parts.slice(0, -1).join(" / ").replaceAll("_", " ")})` : city;
}
