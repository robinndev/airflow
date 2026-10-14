import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { HandNote, Tape } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";

/*
 * The wall with nothing on it yet: the faint outlines and leftover tape where
 * prints would hang, and a note pinned in the middle. Visitors get a sign-in
 * note, artists with an empty board get the ways to save.
 */

const GHOSTS = [
  { left: "4%", top: "10%", w: "15%", ratio: 0.8, tilt: -2, tape: "mint", hideSm: false },
  { left: "22%", top: "52%", w: "19%", ratio: 1.4, tilt: 1.5, tape: "lilac", hideSm: true },
  { left: "6%", top: "64%", w: "12%", ratio: 1, tilt: 2.5, tape: "sky", hideSm: true },
  { left: "71%", top: "8%", w: "20%", ratio: 1.3, tilt: 1.2, tape: "sky", hideSm: false },
  { left: "79%", top: "56%", w: "14%", ratio: 0.75, tilt: -1.8, tape: "mint", hideSm: true },
  { left: "60%", top: "62%", w: "12%", ratio: 1, tilt: -3, tape: "lilac", hideSm: true },
] as const;

function BareWall({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[28px] border-2 border-dashed border-border px-4 py-14 sm:py-24">
      {GHOSTS.map((g, i) => (
        <span
          key={i}
          aria-hidden
          className={`absolute -z-10 ${g.hideSm ? "max-sm:hidden" : ""}`}
          style={{ left: g.left, top: g.top, width: g.w, rotate: `${g.tilt}deg` }}
        >
          {/* Where a print hung: the wall around it faded, the paper didn't. */}
          <span
            className="block rounded-[2px] bg-ink/[0.035] ring-1 ring-ink/[0.06] ring-inset"
            style={{ aspectRatio: g.ratio }}
          />
          <Tape tone={g.tape} className="-top-3 left-1/2 h-5 w-12 -translate-x-1/2 -rotate-3 opacity-60" />
        </span>
      ))}
      <div className="grain relative mx-auto max-w-md -rotate-[0.8deg] rounded-[4px] bg-paper px-6 pt-8 pb-7 text-center text-on-paper shadow-lift sm:px-9">
        <span aria-hidden className="absolute top-3 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-like shadow-[0_2px_3px_rgb(var(--shadow-rgb)/0.35),inset_0_-2px_2px_rgb(0_0_0/0.2)]" />
        {children}
      </div>
    </div>
  );
}

/** The quiet button on paper (the theme's soft button would turn dark in Ember). */
const paperButton =
  "inline-flex h-10 items-center justify-center rounded-action border border-on-paper/15 px-4 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5";

const WAYS = [
  { icon: Heart, label: "the heart on any piece of art", tint: "text-like" },
  { icon: Bookmark, label: "the bookmark on a post", tint: "text-ocean" },
  { icon: Bookmark, label: "the bookmark on a commission", tint: "text-lilac-ink" },
];

export function EmptyWall() {
  return (
    <BareWall>
      <p className="text-[0.625rem] font-bold tracking-[0.2em] text-paper-muted uppercase">Nothing pinned yet</p>
      <h2 className="mt-2 font-display text-2xl leading-tight font-extrabold">An empty wall, for now.</h2>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        When something stops your scroll, save it and it lands here. Look for
      </p>
      <ul className="mx-auto mt-3 grid w-fit gap-2 text-left text-sm">
        {WAYS.map(({ icon: Icon, label, tint }) => (
          <li key={label} className="flex items-center gap-2.5">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-on-paper/[0.06] ${tint}`}>
              <Icon aria-hidden className="size-3.5 fill-current" />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/explore" className={buttonClasses()}>
          Find art in Explore
        </Link>
        <Link href="/" className={paperButton}>
          Open the feed
        </Link>
      </div>
      <HandNote tone="paper" className="mt-5 rotate-[-2deg] text-xl">your colors will show up too ✦</HandNote>
    </BareWall>
  );
}

export function SignedOutWall() {
  return (
    <BareWall>
      <p className="text-[0.625rem] font-bold tracking-[0.2em] text-paper-muted uppercase">Favorites</p>
      <h2 className="mt-2 font-display text-2xl leading-tight font-extrabold">Your moodboard lives in your account.</h2>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        Save art, posts and commissions from anywhere on Artiflow. They&apos;re pinned here, with the colors you keep
        coming back to.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/sign-in?next=/favorites" className={buttonClasses()}>
          Sign in
        </Link>
        <Link href="/join" className={paperButton}>
          Create account
        </Link>
      </div>
    </BareWall>
  );
}

/** Mirrors the board while it streams in: the line, then a row of prints. */
export function BoardSkeleton({ className = "" }: { className?: string }) {
  const tiles = [1.3, 0.8, 1, 1.5, 0.75, 1.2];
  return (
    <div aria-hidden className={className}>
      <div className="skeleton h-3 w-28 rounded-full bg-ink/10" />
      <div className="skeleton mt-3 h-9 w-72 max-w-full rounded-full bg-ink/10" />
      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-10 [--row:7.75rem] sm:[--row:10.5rem] lg:[--row:12.5rem]">
        {tiles.map((ratio, i) => (
          <div
            key={i}
            className="skeleton bg-paper/60 p-2 shadow-soft"
            style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio})`, rotate: `${(i % 3) - 1}deg` }}
          >
            <div className="bg-ink/[0.07]" style={{ aspectRatio: ratio }} />
            <div className="mt-2 h-2.5 w-2/3 rounded-full bg-ink/[0.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}
