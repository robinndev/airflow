"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { endSession, signOutOtherSessions } from "@/app/(site)/settings/actions";
import { dayStamp, noteTime } from "@/components/notifications/time";
import { buttonClasses } from "@/components/ui/button";
import type { AccountSession } from "@/lib/settings/account";

const noop = () => () => {};

/** "Active now", "Active 12m ago", "Active yesterday": in the viewer's own clock, so only in the browser. */
function activeLabel(iso: string) {
  const now = new Date();
  const time = noteTime(iso, now);
  if (time === "now") return "Active now";
  const day = dayStamp(iso, now);
  return day === "Today" ? `Active ${time} ago` : `Active ${day === "Yesterday" ? "yesterday" : day}`;
}

/**
 * Every browser and device signed in to the account: this one first, then
 * the others, each with its own Sign out, and one button for all of them.
 * Access a device already holds lasts until it next renews (within the hour).
 */
export function SessionsList({ initial }: { initial: AccountSession[] }) {
  const [sessions, setSessions] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ending, setEnding] = useState<string | null>(null);
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const others = sessions.filter((session) => !session.current);

  function signOut(id: string) {
    setEnding(id);
    start(async () => {
      const result = await endSession(id);
      setEnding(null);
      if (!result.ok) return setError(result.error);
      setError(null);
      setSessions((list) => list.filter((session) => session.id !== id));
    });
  }

  function signOutOthers() {
    setEnding("others");
    start(async () => {
      const result = await signOutOtherSessions();
      setEnding(null);
      if (!result.ok) return setError(result.error);
      setError(null);
      setSessions((list) => list.filter((session) => session.current));
    });
  }

  return (
    <div>
      <ul aria-label="Signed in on" className="grid">
        {sessions.map((session) => {
          const Icon = session.kind === "phone" ? Smartphone : Laptop;
          return (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 py-3.5 first:border-t-0 first:pt-1">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-[12px] [&_svg]:size-[1.125rem] ${session.current ? "bg-ocean/10 text-ocean" : "bg-ice text-muted"}`}>
                  <Icon aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-ink">
                    {session.device}
                    {session.current && (
                      <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-mint-ink dark:text-mint">This device</span>
                    )}
                  </span>
                  <span className="block text-sm text-muted">
                    {inBrowser ? (
                      <>
                        {session.current ? "You're here now" : activeLabel(session.lastSeen)} · signed in {dayStamp(session.signedInAt).replace("Today", "today").replace("Yesterday", "yesterday")}
                      </>
                    ) : (
                      "\u00a0"
                    )}
                  </span>
                </span>
              </span>
              {!session.current && (
                <button
                  type="button"
                  onClick={() => signOut(session.id)}
                  disabled={pending}
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                  aria-label={`Sign out ${session.device}`}
                >
                  {ending === session.id ? "Signing out…" : "Sign out"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card bg-ice/60 px-4 py-3">
        <p className="text-sm text-muted">
          {others.length > 0
            ? "Lost a phone, or used a shared computer? Sign the others out. It takes hold there within the hour."
            : "Only this device is signed in."}
        </p>
        {others.length > 0 && (
          <button type="button" onClick={signOutOthers} disabled={pending} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            {ending === "others" ? "Signing out…" : "Sign out everywhere else"}
          </button>
        )}
      </div>
    </div>
  );
}
