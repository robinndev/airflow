import Link from "next/link";
import type { CSSProperties } from "react";
import { sinceMonth } from "@/lib/artists/codes";
import type { ArtistProfile } from "@/lib/profile/types";

/*
 * Whether someone sells here, on their profile. Artists (artist access, from
 * an artist code) wear the Artist mark next to their name: a little exhibitor
 * pass, like an artist alley's, that opens to say since when and whose code
 * let them in. Everyone else is a Collector, said quietly beside their handle.
 * Both open the same kind of note (native popover: no JavaScript).
 */

const note =
  "w-64 rounded-card border border-border bg-surface p-3.5 text-left text-sm text-ink shadow-lift supports-[position-area:bottom]:m-0 supports-[position-area:bottom]:mt-1.5 supports-[position-area:bottom]:[position-area:bottom_span-right] supports-[position-area:bottom]:[position-try-fallbacks:flip-block]";

export function ArtistMark({ profile }: { profile: Pick<ArtistProfile, "handle" | "artist"> }) {
  if (!profile.artist) return null;
  const { since, invitedBy } = profile.artist;
  const id = `artist-mark-${profile.handle.replace(/[^a-z0-9_]/g, "")}`;
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        data-part="artist-mark"
        aria-label="Artiflow artist: more about it"
        className="inline-flex h-7 -rotate-2 items-center gap-1.5 rounded-[6px] bg-lilac/15 pr-2.5 pl-2 font-display text-[0.6875rem] font-extrabold tracking-[0.16em] text-lilac-ink uppercase shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.15)] transition-[rotate,background-color] hover:rotate-0 hover:bg-lilac/22 dark:text-lilac"
        style={{ anchorName: `--${id}` } as CSSProperties}
      >
        {/* The punched hole of a pass on a lanyard. */}
        <span aria-hidden className="size-1.5 rounded-full bg-canvas shadow-[inset_0_1px_1px_rgb(var(--shadow-rgb)/0.3)]" />
        Artist
      </button>
      <div id={id} popover="auto" className={note} style={{ positionAnchor: `--${id}` } as CSSProperties}>
        <p className="font-display font-bold">Artiflow artist</p>
        <p className="mt-1 text-muted">
          Selling here since {sinceMonth(since)}.{" "}
          {invitedBy ? (
            <>
              Let in with{" "}
              <Link href={`/${invitedBy}`} className="font-semibold text-ink underline decoration-border underline-offset-2 hover:decoration-ocean">
                @{invitedBy}
              </Link>
              &apos;s artist code.
            </>
          ) : (
            "One of our founding artists."
          )}
        </p>
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
          Every artist on Artiflow was let in by another artist, with a code that works once.
        </p>
      </div>
    </>
  );
}

export function CollectorMark({ profile }: { profile: Pick<ArtistProfile, "handle" | "artist"> }) {
  if (profile.artist !== null) return null;
  const id = `collector-mark-${profile.handle.replace(/[^a-z0-9_]/g, "")}`;
  return (
    <>
      <span aria-hidden>·</span>
      <button
        type="button"
        popoverTarget={id}
        data-part="collector-mark"
        className="rounded-input font-medium text-muted underline decoration-dotted decoration-border underline-offset-4 transition-colors hover:text-ink"
        style={{ anchorName: `--${id}` } as CSSProperties}
      >
        Collector
      </button>
      {/* Inside the handle's <p>, so spans only (a <div> there breaks the page's HTML). */}
      <span id={id} popover="auto" className={note} style={{ positionAnchor: `--${id}` } as CSSProperties}>
        <span className="block font-display font-bold">Collector</span>
        <span className="mt-1 block text-muted">
          Browses, collects and commissions art on Artiflow. Selling here takes an artist code, which an artist hands on.
        </span>
      </span>
    </>
  );
}
