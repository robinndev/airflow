import { Fragment } from "react";
import { HandNote, Tape } from "@/components/explore/doodles";
import type { FavoriteItem } from "@/lib/favorites/queries";
import { blendPalettes, MOODS } from "@/lib/palette";
import { MoodButton } from "./pinned";

/*
 * "Your colors": a watercolor swatch card, the kind artists paint to test
 * their pigments, mixed from everything on the moodboard. Each swatch is a
 * painted patch whose edges bleed (SVG turbulence) and pool darker at the
 * rim, the way watercolor dries. The moods it names filter the wall.
 */

const SWATCHES = 6;

export function SwatchCard({ items }: { items: FavoriteItem[] | null }) {
  const colors = blendPalettes((items ?? []).map((item) => item.palette), SWATCHES);
  const onWall = (items ?? []).filter((item) => item.kind === "post" || (item.kind === "art" && !item.adopt));
  const moods = MOODS.map((mood) => ({ mood, count: onWall.filter((item) => item.moods.includes(mood.slug)).length }))
    .filter((m) => m.count > 0)
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 2);

  return (
    <figure className="relative mx-auto mb-6 w-full max-w-[23rem] lg:mr-0 lg:mb-0">
      <div className="grain relative rotate-[2deg] rounded-[6px] bg-paper p-5 pb-6 text-on-paper shadow-lift sm:p-6">
        <Tape tone="lilac" className="-top-3 left-6 w-20 -rotate-[7deg]" />
        <Tape tone="mint" className="-top-3 right-5 w-16 rotate-[9deg]" />
        <BleedFilter />

        <p className="flex items-baseline justify-between text-[0.5625rem] font-bold tracking-[0.2em] text-paper-muted uppercase">
          <span>Swatch card</span>
          {items && items.length > 0 && <span className="tabular-nums">Nº {items.length}</span>}
        </p>
        <p className="mt-1 font-display text-xl font-extrabold">Your colors</p>

        <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3.5">
          {Array.from({ length: SWATCHES }, (_, i) => (
            <li key={i}>
              <Swatch color={colors[i]} index={i} />
            </li>
          ))}
        </ul>

        <figcaption className="mt-5 text-[0.8125rem] leading-relaxed text-paper-muted">
          {!items ? (
            "Sign in and save a few pieces: this card mixes itself from your favorites."
          ) : colors.length === 0 ? (
            "Empty for now. Every piece you save adds its colors here."
          ) : (
            <>
              Mixed from {items.length} {items.length === 1 ? "favorite" : "favorites"}.
              {moods.length > 0 && (
                <>
                  {" "}
                  Mostly{" "}
                  {moods.map(({ mood }, i) => (
                    <Fragment key={mood.slug}>
                      {i > 0 && " & "}
                      <MoodButton mood={mood.slug}>{mood.name}</MoodButton>
                    </Fragment>
                  ))}
                  .
                </>
              )}
            </>
          )}
        </figcaption>
      </div>
      {colors.length > 0 && (
        <HandNote className="absolute -bottom-9 left-2 -rotate-[5deg] sm:-left-6">your colors, apparently ♥</HandNote>
      )}
    </figure>
  );
}

/** One painted patch, labeled in pencil. Flipped per index so no two bleed alike. */
function Swatch({ color, index }: { color?: string; index: number }) {
  const flip = ["", "-scale-x-100", "rotate-180", "-scale-y-100", "-scale-x-100 rotate-180", ""][index % 6];
  if (!color) {
    return (
      <span aria-hidden className="block">
        <span className="block aspect-[100/64] rounded-[3px] border-[1.5px] border-dashed border-on-paper/20" />
        <span className="mt-1 block h-3 w-10 rounded-full bg-on-paper/8" />
      </span>
    );
  }
  return (
    <span className="block">
      <svg aria-hidden viewBox="0 0 100 64" className={`block w-full overflow-visible ${flip}`}>
        <g filter="url(#swatch-bleed)">
          <rect x="4" y="4" width="92" height="56" rx="2" fill={color} />
          <rect
            x="5"
            y="5"
            width="90"
            height="54"
            rx="2"
            fill="none"
            strokeWidth="3"
            style={{ stroke: `color-mix(in oklab, ${color} 72%, black)` }}
            opacity=".4"
          />
          <rect x="4" y="4" width="92" height="56" rx="2" fill="url(#swatch-bloom)" />
        </g>
      </svg>
      <span className="mt-1 block font-mono text-[0.625rem] tracking-wide text-paper-muted uppercase">{color}</span>
    </span>
  );
}

function BleedFilter() {
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        <filter id="swatch-bleed" x="-8%" y="-12%" width="116%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="swatch-bloom" cx="0.42" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function SwatchCardSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[23rem] lg:mr-0">
      <div className="skeleton rotate-[2deg] rounded-[6px] bg-paper/70 p-6 shadow-soft">
        <div className="h-2.5 w-20 rounded-full bg-on-paper/10" />
        <div className="mt-2.5 h-5 w-28 rounded-full bg-on-paper/10" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {Array.from({ length: SWATCHES }, (_, i) => (
            <div key={i} className="aspect-[100/64] rounded-[3px] bg-on-paper/8" />
          ))}
        </div>
        <div className="mt-6 h-3 w-48 rounded-full bg-on-paper/8" />
      </div>
    </div>
  );
}
