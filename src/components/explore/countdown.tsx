"use client";

import { Bell, BellRing } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

/*
 * One shared one-second clock for every countdown on the page. The server
 * snapshot is 0, so prerendered HTML shows the fallback and the live time
 * appears right after hydration (no mismatch, no per-component timers).
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const useNow = () => useSyncExternalStore(subscribe, () => now, () => 0);

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** "2h 15m", "1d 2h", "45m 10s" — for stamps and inline copy. */
export function Countdown({ to, fallback = "soon", done = "now" }: { to: string; fallback?: string; done?: string }) {
  const current = useNow();
  if (!current) return <span>{fallback}</span>;

  const left = new Date(to).getTime() - current;
  if (left <= 0) return <span>{done}</span>;
  const { days, hours, minutes, seconds } = split(left);
  const text = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
  return (
    <time dateTime={to} className="tabular-nums">
      {text}
    </time>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Big HH : MM : SS clock for drops. */
export function DropClock({ to, className = "" }: { to: string; className?: string }) {
  const current = useNow();
  const { days, hours, minutes, seconds } = split(current ? new Date(to).getTime() - current : 0);
  const units = [
    { value: current ? pad(days * 24 + hours) : "--", label: "hrs" },
    { value: current ? pad(minutes) : "--", label: "min" },
    { value: current ? pad(seconds) : "--", label: "sec" },
  ];

  return (
    <time dateTime={to} className={`flex items-start gap-1.5 ${className}`}>
      {units.map((unit, i) => (
        <span key={unit.label} className="flex items-start gap-1.5">
          {i > 0 && <span className="pt-1 text-2xl font-bold opacity-50">:</span>}
          <span className="flex flex-col items-center">
            <span className="min-w-[2.3ch] text-center font-display text-4xl font-extrabold tabular-nums">
              {unit.value}
            </span>
            <span className="text-[0.625rem] font-semibold tracking-[0.16em] uppercase opacity-60">{unit.label}</span>
          </span>
        </span>
      ))}
    </time>
  );
}

// UI-only until notifications are persisted (Phase 2 in the blueprint).
export function RemindButton({
  label,
  doneLabel,
  className = "",
}: {
  label: string;
  doneLabel: string;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  const Icon = on ? BellRing : Bell;
  return (
    <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} className={className}>
      <Icon aria-hidden className={on ? "animate-swing" : ""} />
      {on ? doneLabel : label}
    </button>
  );
}
