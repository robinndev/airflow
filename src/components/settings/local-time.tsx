"use client";

import { Clock } from "lucide-react";
import { useSyncExternalStore } from "react";
import { clockIn, differenceLabel } from "@/lib/settings/time";

/*
 * An artist's local time, shown where they chose to show it (profile, the
 * chat's studio card): their clock and how far it is from the visitor's.
 * Clocks only exist in the browser, so the server renders nothing.
 */

function subscribeMinute(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    onChange();
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
  };
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
  return () => clearTimeout(timer);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);
const noop = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The current minute, ticking on the minute; null on the server. */
export function useMinute(): Date | null {
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  return minute === null ? null : new Date(minute * 60_000);
}

/** The visitor's own zone; null on the server. */
export function useBrowserZone(): string | null {
  return useSyncExternalStore(noop, browserZone, () => null);
}

/** "3:42 pm for Mira · 2h ahead of you". */
export function LocalTime({ zone, name, className = "", iconClassName = "size-4" }: { zone: string; name: string; className?: string; iconClassName?: string }) {
  const now = useMinute();
  const mine = useBrowserZone();
  if (!now || !mine) return null;
  const first = name.split(" ")[0];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Clock aria-hidden className={iconClassName} />
      <span>
        <time dateTime={now.toISOString()}>{clockIn(zone, now)}</time> for {first}
        <span className="opacity-75"> · {differenceLabel(zone, mine, now)}</span>
      </span>
    </span>
  );
}
