"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Sparkle } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { showToast } from "@/components/favorites/toast-events";
import { useFollow, useFollowsYou } from "@/components/social/store";
import { buttonClasses } from "@/components/ui/button";
import { followLabel, type FollowPerson } from "@/lib/follows/list";
import { formatMonthYear } from "@/lib/format";
import { averageOf } from "@/lib/palette";
import { artistLabels } from "@/lib/profile/draws";

/*
 * Someone on a followers / following list, as a small artist trading card
 * (the same card /plans deals out): name on top, their cover in the art
 * window with their picture set in its corner, a type line (artist or
 * collector, what they draw), and the follow button. Their plan is the
 * card's finish: matte card stock, foil for Flow+. The face is paper, light
 * in both themes; the finish stays on the frame, never over the art.
 */

const FRAMES = {
  free: "grain bg-[color-mix(in_oklab,var(--sky)_16%,var(--paper))] ring-1 ring-on-paper/10",
  pro: "foil",
} as const;

export function PersonCard({
  person,
  viewer,
  number,
  followsYouKnown,
  markFollowsYou,
}: {
  person: FollowPerson;
  /** The signed-in viewer's id (null: a visitor; undefined: not known yet). */
  viewer: string | null | undefined;
  /** The card's number in the whole list ("No. 12"), when the list isn't filtered. */
  number?: number;
  /** Whether they follow the viewer, when the page already knows (your own followers). */
  followsYouKnown?: boolean;
  /** Show the "Follows you" stamp (not on your own followers list: they all do). */
  markFollowsYou: boolean;
}) {
  const you = viewer === person.id;
  const role = person.artist ? (person.artist.verified ? "Verified artist" : "Artist") : "Collector";
  const draws = artistLabels(person.draws)[0]?.label.replace(/ artist$/, "");

  return (
    <article
      data-part="person"
      // `data-active` holds the foil still: a page of drifting cards is a lot of paint.
      data-active
      className={`relative flex h-full flex-col rounded-[14px] p-[5px] shadow-soft transition-transform duration-200 hover:-translate-y-0.5 ${FRAMES[person.plan]}`}
    >
      <div className="flex flex-1 flex-col rounded-[10px] bg-paper text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.12)]">
        <header className="flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-1.5">
          <h3 className="min-w-0 truncate font-display text-[0.9375rem] leading-tight font-extrabold tracking-tight">
            {/* The whole card opens their profile; the button sits above the link. */}
            <Link
              href={`/${person.handle}`}
              className="rounded-[4px] outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-2 focus-visible:after:ring-ocean"
            >
              {person.displayName}
            </Link>
          </h3>
          {person.plan === "pro" && (
            <span className="shrink-0 text-ocean" title="Flow+">
              <span className="sr-only">Flow+</span>
              <Sparkle className="size-3" />
            </span>
          )}
        </header>

        <div
          className="relative mx-1.5 aspect-[4/3] overflow-hidden rounded-[7px] bg-ice"
          style={{ backgroundColor: averageOf(person.banner.palette) }}
        >
          <Image src={person.banner.src} alt="" fill sizes="(min-width: 640px) 220px, 46vw" className="object-cover" />
          {/* The window's bevel. */}
          <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_4px_rgb(0_0_0/0.3)]" />
          <Image
            src={person.avatar.src}
            alt=""
            width={48}
            height={48}
            className="absolute bottom-1.5 left-1.5 size-11 rounded-full bg-ice object-cover shadow-lift ring-[3px] ring-paper"
            style={{ objectPosition: person.avatar.focus }}
          />
          {markFollowsYou && !you && <FollowsYouStamp handle={person.handle} known={followsYouKnown} />}
        </div>

        <p className="mx-2.5 mt-2 flex items-center justify-between gap-2 border-b border-on-paper/10 pb-1 text-[0.5625rem] font-extrabold tracking-[0.14em] text-paper-muted uppercase">
          <span className="truncate">{role}</span>
          {draws && <span className="truncate text-right">{draws}</span>}
        </p>
        <p className="mx-2.5 mt-1 truncate text-xs text-paper-muted">@{person.handle}</p>

        <div className="relative z-10 mx-2 mt-auto pt-2.5 pb-2">
          {you ? (
            <p className="flex h-8 items-center justify-center rounded-action border border-dashed border-on-paper/20 text-xs font-semibold text-paper-muted">
              That&rsquo;s you
            </p>
          ) : (
            <CardFollowButton handle={person.handle} followsYouKnown={followsYouKnown} />
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-on-paper/10 px-2.5 py-1 text-[0.5625rem] font-semibold tracking-wide text-paper-muted">
          <span className="truncate">since {formatMonthYear(person.followedAt)}</span>
          {number !== undefined && <span className="shrink-0 tabular-nums">No. {number}</span>}
        </footer>
      </div>
    </article>
  );
}

function FollowsYouStamp({ handle, known }: { handle: string; known?: boolean }) {
  const followsYou = useFollowsYou(handle, known);
  if (!followsYou) return null;
  return (
    <Stamp tone="lilac" onPaper className="absolute top-1.5 right-1.5 -rotate-6 bg-paper/95 !text-[0.5625rem] !tracking-[0.12em]">
      Follows you
    </Stamp>
  );
}

/**
 * Follow, Follow back, or Following (which reads "Unfollow" under the
 * pointer). Unfollowing raises a toast with Undo, since the card stays put.
 */
function CardFollowButton({ handle, followsYouKnown }: { handle: string; followsYouKnown?: boolean }) {
  const { following, toggle, set } = useFollow(handle);
  const followsYou = useFollowsYou(handle, followsYouKnown) ?? false;
  const label = followLabel({ following, followsYou });

  function press() {
    toggle();
    if (following) showToast({ message: `Unfollowed @${handle}`, undo: () => set(true) });
  }

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow @${handle}` : `${label} @${handle}`}
      onClick={press}
      className={
        following
          ? "group/follow inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-action border border-on-paper/15 bg-paper text-xs font-semibold text-on-paper transition-colors hover:border-danger/40 hover:bg-danger/6 hover:text-danger focus-visible:border-danger/40 focus-visible:text-danger [&_svg]:size-3.5"
          : buttonClasses({ size: "sm", className: "h-8 w-full px-2 text-xs" })
      }
    >
      {following ? (
        <>
          <Check aria-hidden className="group-hover/follow:hidden group-focus-visible/follow:hidden" />
          <span className="group-hover/follow:hidden group-focus-visible/follow:hidden">{label}</span>
          <span className="hidden group-hover/follow:inline group-focus-visible/follow:inline">Unfollow</span>
        </>
      ) : (
        <>
          <Plus aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
