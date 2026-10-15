"use client";

import { useState, useTransition } from "react";
import { saveMutedNotifications } from "@/app/(site)/settings/actions";
import { ALWAYS_ON, NOTICE_GROUPS, type MutableKind } from "@/lib/settings/notifications";
import { SwitchRow } from "./switch";

/**
 * What gets signed into your guest book: a switch per kind, saved as you
 * flip it. Turning one off stops new ones; what's already in the book stays.
 */
export function NoticePrefs({ initialMuted }: { initialMuted: MutableKind[] }) {
  const [muted, setMuted] = useState(new Set(initialMuted));
  const [status, setStatus] = useState<{ tone: "ok" | "problem"; text: string } | null>(null);
  const [, start] = useTransition();

  function flip(kind: MutableKind, on: boolean) {
    const before = muted;
    const next = new Set(muted);
    if (on) next.delete(kind);
    else next.add(kind);
    setMuted(next);
    setStatus(null);
    start(async () => {
      const result = await saveMutedNotifications([...next]);
      if (result.ok) return setStatus({ tone: "ok", text: "Saved." });
      setMuted(before);
      setStatus({ tone: "problem", text: result.error });
    });
  }

  return (
    <div>
      {NOTICE_GROUPS.map((group) => (
        <fieldset key={group.title} className="mt-4 first:mt-0">
          <legend className="text-xs font-bold tracking-wider text-muted uppercase">{group.title}</legend>
          <div className="divide-y divide-border/70">
            {group.items.map((item) => (
              <SwitchRow
                key={item.kind}
                label={item.label}
                hint={item.hint}
                checked={!muted.has(item.kind)}
                onChange={(on) => flip(item.kind, on)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="mt-4">
        <legend className="text-xs font-bold tracking-wider text-muted uppercase">Always on</legend>
        <div className="divide-y divide-border/70">
          {ALWAYS_ON.map((entry) => (
            <SwitchRow key={entry.label} label={entry.label} hint={entry.hint} locked="Always on" />
          ))}
        </div>
      </fieldset>

      <p
        role={status?.tone === "problem" ? "alert" : "status"}
        className={`mt-2 min-h-5 text-sm ${status?.tone === "problem" ? "text-danger" : "text-mint-ink dark:text-mint"}`}
      >
        {status?.text}
      </p>
    </div>
  );
}
