"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, Check, Ticket, Users, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CODES_FOR_VERIFIED, progressOf, VERIFY_GOALS, type Progress } from "@/lib/artists/codes";
import { formatUsd } from "@/lib/format";

/*
 * Missions: the way to verification, always at hand in the bottom-right
 * corner for artists who aren't verified yet. Small (a pill with how many
 * are done and a ring of how far along); click it and it opens into a paper
 * checklist: followers and sales, how much each has reached, and the reward.
 * Rendered by the header (which knows the viewer) into <body>, so it stays
 * put while the header changes. On the home feed it steps up above the
 * floating Post button.
 */

const SEEN_KEY = "artiflow-missions-seen";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function Missions({ progress }: { progress: Progress }) {
  const id = useId();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  // A dot on the pill until it's been opened once (per browser). Read on the client only
  // (nothing renders before hydration), so storage being blocked just means no dot.
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return true;
    }
  });
  const box = useRef<HTMLDivElement>(null);
  const share = progressOf(progress);
  const done = Number(share.followers >= 1) + Number(share.sales >= 1);
  const overall = (share.followers + share.sales) / 2;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((o) => !o);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Storage blocked: the dot comes back next time.
      }
    }
  }

  if (!hydrated) return null;

  const goals = [
    {
      key: "followers",
      title: `Get ${VERIFY_GOALS.followers} followers`,
      have: `${Math.min(progress.followers, VERIFY_GOALS.followers)} / ${VERIFY_GOALS.followers}`,
      hint: "People who follow your profile.",
      fill: share.followers,
      icon: <Users aria-hidden className="size-3.5" />,
    },
    {
      key: "sales",
      title: `Sell ${formatUsd(VERIFY_GOALS.salesUsd)} on Artiflow`,
      have: `${formatUsd(Math.min(progress.salesUsd, VERIFY_GOALS.salesUsd))} / ${formatUsd(VERIFY_GOALS.salesUsd)}`,
      hint: "Commission orders paid by the buyer.",
      fill: share.sales,
      icon: <Banknote aria-hidden className="size-3.5" />,
    },
  ];

  // The ring: how far along both missions are, together.
  const r = 15;
  const circumference = 2 * Math.PI * r;

  return createPortal(
    <div
      ref={box}
      data-part="missions"
      className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 transition-[bottom] duration-300 sm:right-6 sm:bottom-6 [body:has([data-floating-post])_&]:bottom-20 sm:[body:has([data-floating-post])_&]:bottom-[5.5rem]"
    >
      {open && (
        <section
          id={`${id}-panel`}
          aria-labelledby={`${id}-title`}
          className="grain w-[min(19rem,calc(100vw-2rem))] origin-bottom-right animate-rise rounded-card bg-paper p-4 text-on-paper shadow-lift ring-1 ring-on-paper/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Your missions</p>
              <h2 id={`${id}-title`} className="mt-0.5 font-display text-lg leading-tight font-extrabold">
                Get verified
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close missions"
              className="-mt-1 -mr-1 grid size-8 place-items-center rounded-full text-paper-muted transition-colors hover:bg-on-paper/5 hover:text-on-paper"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>

          <ul className="mt-3 space-y-3.5">
            {goals.map((goal) => {
              const complete = goal.fill >= 1;
              return (
                <li key={goal.key} data-mission={goal.key} data-done={complete || undefined}>
                  <div className="flex items-start gap-2.5">
                    {/* A pen-drawn box, ticked when it's done. */}
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border-2 ${
                        complete ? "border-mint bg-mint text-white" : "border-paper-muted/45 text-paper-muted"
                      }`}
                    >
                      {complete ? <Check className="size-3.5" strokeWidth={3} /> : goal.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2 text-sm">
                        <span className={`font-semibold ${complete ? "text-paper-muted line-through decoration-mint decoration-2" : ""}`}>{goal.title}</span>
                        <span className="shrink-0 font-semibold text-paper-muted tabular-nums">{goal.have}</span>
                      </p>
                      <span
                        role="progressbar"
                        aria-label={`${goal.title}: ${goal.have}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(goal.fill * 100)}
                        className="mt-1.5 block h-2 overflow-hidden rounded-full bg-on-paper/8"
                      >
                        <span
                          className={`block h-full rounded-full bg-gradient-to-r ${complete ? "from-mint to-sky" : "from-lilac to-ocean"}`}
                          style={{ width: `${Math.max(goal.fill * 100, goal.fill > 0 ? 6 : 0)}%` }}
                        />
                      </span>
                      <p className="mt-1 text-xs text-paper-muted">{goal.hint}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* What both missions earn. */}
          <div className="mt-4 rounded-[12px] border-2 border-dashed border-paper-muted/25 px-3 py-2.5">
            <p className="text-[0.625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">Reward</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck aria-hidden className="size-4 text-lilac-ink dark:text-lilac" />
                Verified mark
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ticket aria-hidden className="size-4 text-mint-ink dark:text-mint" />
                {CODES_FOR_VERIFIED} artist codes
              </span>
            </p>
          </div>

          <Link
            href="/codes"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:underline"
          >
            See your codes and pass
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </section>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-label={`Missions: ${done} of 2 done`}
        className="relative inline-flex h-12 items-center gap-2 rounded-full bg-paper pr-4 pl-1.5 text-on-paper shadow-lift ring-1 ring-on-paper/10 transition-transform hover:-translate-y-0.5 active:scale-95"
      >
        {/* A ring around the mark: how far along, both missions together. */}
        <span className="relative grid size-9 place-items-center">
          <svg aria-hidden viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-on-paper/10" />
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - overall)}
              className="stroke-lilac transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <BadgeCheck aria-hidden className="size-4.5 text-lilac-ink dark:text-lilac" />
        </span>
        <span className="font-display text-sm font-extrabold">Missions</span>
        <span className="rounded-full bg-on-paper/8 px-1.5 text-xs font-bold text-paper-muted tabular-nums">{done}/2</span>
        {!seen && <span aria-hidden className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-like ring-2 ring-paper" />}
      </button>
    </div>,
    document.body,
  );
}
