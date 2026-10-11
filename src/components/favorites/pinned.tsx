"use client";

import { PinOff } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { FavoriteKind } from "@/lib/favorites/keys";
import { MOODS, type MoodSlug } from "@/lib/palette";
import { resetBoard, setHidden, setMood, setShow, useBoard, type WallShow } from "./board-store";
import { unpin } from "./store";

/** Where a favorite hangs: on the wall (art, posts) or on the line (things to buy). */
export type PinGroup = "art" | "post" | "line";

export type PinEntry = { key: string; group: PinGroup; moods: MoodSlug[] };

function shows(board: ReturnType<typeof useBoard>, entry: PinEntry) {
  if (board.hidden.has(entry.key)) return false;
  if (entry.group === "line") return true;
  if (board.show === "art" && entry.group !== "art") return false;
  if (board.show === "posts" && entry.group !== "post") return false;
  return !board.mood || entry.moods.includes(board.mood);
}

/**
 * One saved thing on the board (server-rendered children), with the unpin
 * control. Unpinning drops it off the wall; Undo in the toast hangs it back.
 */
export function Pinned({
  entry,
  target,
  className = "",
  unpinClassName = "-top-2.5 -right-2.5",
  style,
  children,
}: {
  entry: PinEntry;
  target: { kind: FavoriteKind; id: string; title: string; savedAt: string };
  className?: string;
  /** Where the unpin button sits (the line's cards hang below the string). */
  unpinClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const board = useBoard();
  const [falling, setFalling] = useState(false);

  function takeDown() {
    setFalling(true);
    // Let it fall first, then take it off the wall.
    setTimeout(
      () =>
        unpin(target, (hidden) => {
          if (!hidden) setFalling(false);
          setHidden(entry.key, hidden);
        }),
      320,
    );
  }

  return (
    <li
      hidden={!shows(board, entry)}
      className={`group/pin relative transition-[translate,rotate,opacity] duration-300 ease-in ${
        falling ? "pointer-events-none translate-y-8 rotate-[7deg] opacity-0" : ""
      } ${className}`}
      style={style}
    >
      {children}
      <button
        type="button"
        onClick={takeDown}
        aria-label={`Unpin ${target.title}`}
        title="Unpin"
        className={`absolute z-20 grid ${unpinClassName} size-8 place-items-center rounded-full bg-paper text-on-paper opacity-0 shadow-lift ring-1 ring-on-paper/10 transition-[opacity,scale,color] group-focus-within/pin:opacity-100 group-hover/pin:opacity-100 hover:scale-110 hover:text-like focus-visible:opacity-100 active:scale-95 pointer-coarse:opacity-100 [&_svg]:size-4`}
      >
        <PinOff aria-hidden />
      </button>
    </li>
  );
}

const SHOW: { key: WallShow; label: string; group?: PinGroup }[] = [
  { key: "all", label: "Everything" },
  { key: "art", label: "Art", group: "art" },
  { key: "posts", label: "Posts", group: "post" },
];

/** A strip of masking tape with a label on it: the wall's filters. */
const tape =
  "relative inline-flex h-9 shrink-0 items-center gap-1.5 px-4 text-sm font-bold transition-[rotate,background-color,color] [clip-path:polygon(0_6%,4%_0,96%_5%,100%_0,98%_50%,100%_96%,95%_100%,5%_94%,0_100%,2%_50%)]";

/**
 * The wall's controls (kind, color) over the server-rendered prints, with a
 * note when a filter leaves the wall bare.
 */
export function WallView({ entries, children }: { entries: PinEntry[]; children: ReactNode }) {
  const board = useBoard();
  useEffect(() => resetBoard, []);

  const live = entries.filter((e) => !board.hidden.has(e.key));
  const moods = MOODS.filter((m) => live.some((e) => e.moods.includes(m.slug)));
  const visible = live.filter((e) => shows(board, e)).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div role="group" aria-label="Show" className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
          {SHOW.map((s, i) => {
            const count = s.group ? live.filter((e) => e.group === s.group).length : live.length;
            if (s.group && count === 0) return null;
            const active = board.show === s.key;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={active}
                onClick={() => setShow(s.key)}
                className={`${tape} ${i % 2 ? "rotate-[1.2deg]" : "-rotate-[1deg]"} ${
                  active ? "bg-ocean text-white" : "bg-[color-mix(in_oklab,var(--star)_22%,var(--paper))] text-on-paper hover:rotate-0"
                }`}
              >
                {s.label}
                <span className={`tabular-nums ${active ? "text-white/75" : "text-paper-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {moods.length > 1 && (
          <div role="group" aria-label="Filter by color" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[0.625rem] font-bold tracking-[0.16em] text-muted uppercase">Color</span>
            {moods.map((m) => {
              const active = board.mood === m.slug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMood(active ? null : m.slug)}
                  title={`${m.name}: ${m.hint.toLowerCase()}`}
                  className="group/chip inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface/70 py-1 pr-3 pl-1 text-[0.8125rem] font-semibold text-muted backdrop-blur-sm transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
                >
                  <span
                    aria-hidden
                    className="size-7 rounded-full ring-2 ring-paper"
                    style={{ background: `conic-gradient(${m.swatches.slice(0, 4).join(", ")}, ${m.swatches[0]})` }}
                  />
                  {m.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {visible} pinned
      </p>

      {children}

      {visible === 0 && live.some((e) => e.group !== "line") && (
        <div className="mt-6 rounded-[20px] border-2 border-dashed border-border px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">Nothing pinned in this mix</p>
          <p className="mt-1 text-sm text-muted">Try another color, or take the filters off.</p>
          <button
            type="button"
            onClick={() => {
              setShow("all");
              setMood(null);
            }}
            className="mt-5 h-10 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
          >
            Show the whole wall
          </button>
        </div>
      )}
    </>
  );
}

/** A color named on the swatch card: shows only that part of the wall. */
export function MoodButton({ mood, children }: { mood: MoodSlug; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        setShow("all");
        setMood(mood);
        document.getElementById("wall")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="font-bold text-on-paper underline decoration-on-paper/25 decoration-2 underline-offset-[3px] transition-colors hover:decoration-ocean"
    >
      {children}
    </button>
  );
}
