"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { saveLocalTime } from "@/app/(site)/settings/actions";
import { fieldClass, labelClass } from "@/components/auth/form-ui";
import { isTimeZone, offsetMinutes, zoneLabel } from "@/lib/settings/time";
import { LocalTime, useBrowserZone, useMinute } from "./local-time";
import { SwitchRow } from "./switch";

function gmt(minutes: number) {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  return `GMT${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, "0")}` : ""}`;
}

/**
 * "Show your local time on your profile": buyers in other countries see
 * your clock (and how far it is from theirs) before they write. Saved as
 * you change it; hidden means nothing is stored.
 */
export function LocalTimeSetting({ initialZone, name }: { initialZone: string | null; name: string }) {
  const id = useId();
  const detected = useBrowserZone();
  const now = useMinute();
  const [shown, setShown] = useState(initialZone !== null);
  const [picked, setPicked] = useState<string | null>(initialZone);
  const [status, setStatus] = useState<{ tone: "ok" | "problem"; text: string } | null>(null);
  const [, start] = useTransition();
  const zone = picked ?? detected ?? "UTC";

  // Every zone the browser knows, west to east, with its offset right now.
  const zones = useMemo(() => {
    if (!now) return [];
    const all = Intl.supportedValuesOf("timeZone").filter(isTimeZone);
    return (all.includes(zone) ? all : [zone, ...all])
      .map((value) => ({ value, offset: offsetMinutes(value, now) }))
      .sort((a, b) => a.offset - b.offset || a.value.localeCompare(b.value));
  }, [now, zone]);

  function save(nextShown: boolean, nextZone: string) {
    const before = { shown, picked };
    setShown(nextShown);
    setPicked(nextZone);
    setStatus(null);
    start(async () => {
      const result = await saveLocalTime(nextShown ? nextZone : null);
      if (result.ok) return setStatus({ tone: "ok", text: nextShown ? "Saved. It's on your profile now." : "Saved. Your local time is hidden." });
      setShown(before.shown);
      setPicked(before.picked);
      setStatus({ tone: "problem", text: result.error });
    });
  }

  return (
    <div>
      <SwitchRow
        label="Show your local time on your profile"
        hint="Buyers in other countries see your clock, and how far it is from theirs, before they write. While it's hidden, nothing about it is kept."
        checked={shown}
        onChange={(on) => save(on, zone)}
      />
      {shown && (
        <div className="mb-2 grid gap-3 rounded-card border border-border bg-canvas/40 p-4">
          <div className="min-w-0">
            <label htmlFor={`${id}-zone`} className={labelClass}>
              Your time zone
            </label>
            <select id={`${id}-zone`} value={zone} onChange={(event) => save(true, event.target.value)} className={`${fieldClass} mt-2 pr-8`}>
              {zones.length === 0 && <option value={zone}>{zoneLabel(zone)}</option>}
              {zones.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {gmt(entry.offset)} · {zoneLabel(entry.value)}
                  {entry.value === detected ? " · this device" : ""}
                </option>
              ))}
            </select>
          </div>
          {/* What visitors see on the profile. */}
          <p className="text-sm text-muted">
            Visitors see: <LocalTime zone={zone} name={name} className="ml-1 rounded-full bg-surface px-2.5 py-1 align-middle text-ink/85 shadow-soft" iconClassName="size-3.5" />
          </p>
        </div>
      )}
      <p
        role={status?.tone === "problem" ? "alert" : "status"}
        className={`min-h-5 text-sm ${status?.tone === "problem" ? "text-danger" : "text-mint-ink dark:text-mint"}`}
      >
        {status?.text}
      </p>
    </div>
  );
}
