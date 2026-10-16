import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { PULSE, type ArtistRef } from "@/lib/explore";
import { formatCompact } from "@/lib/format";
import { FEE_FREE } from "@/lib/plans";
import { HandNote, Sparkle, Tape } from "./doodles";
import { HumanSeal } from "./human-seal";

// A loose pin-board of polaroids, positioned in % of the board.
const PINS = [
  { left: 0, top: 6, width: 30, rotate: -6, tape: "mint" },
  { left: 35, top: 0, width: 29, rotate: 4, tape: null },
  { left: 69, top: 8, width: 29, rotate: -3, tape: "lilac" },
  { left: 3, top: 52, width: 29, rotate: 5, tape: null },
  { left: 40, top: 46, width: 30, rotate: -4, tape: "sky" },
  { left: 71, top: 55, width: 28, rotate: 7, tape: null },
] as const;

/** The people behind the art, pinned up like polaroids. */
function ArtistBoard({ artists }: { artists: ArtistRef[] }) {
  return (
    <div className="relative aspect-square w-full">
      {artists.slice(0, PINS.length).map((artist, i) => {
        const pin = PINS[i];
        return (
          <Link
            key={artist.handle}
            href={artist.href}
            className="group/pin absolute block rounded-[4px] bg-paper p-2 pb-1 shadow-lift transition-[rotate,scale] duration-300 rotate-(--r) hover:z-10 hover:scale-105 hover:rotate-0"
            style={{ left: `${pin.left}%`, top: `${pin.top}%`, width: `${pin.width}%`, "--r": `${pin.rotate}deg` } as CSSProperties}
          >
            {pin.tape && <Tape tone={pin.tape} className="-top-3 left-1/2 w-14 -translate-x-1/2 -rotate-3" />}
            <span className="relative block aspect-square overflow-hidden rounded-[2px] bg-ice">
              <Image
                src={artist.avatar.src}
                alt=""
                fill
                sizes="140px"
                className="object-cover"
                style={{ objectPosition: artist.avatar.focus ?? "50% 25%" }}
              />
            </span>
            <HandNote tone="paper" className="block truncate py-1 text-center text-[1.0625rem]">
              @{artist.handle}
            </HandNote>
          </Link>
        );
      })}
      <HumanSeal id="manifesto-seal-path" className="absolute top-[84%] left-[21%] w-[24%]" />
    </div>
  );
}

/** Closing note: why the platform exists, and a door for artists. */
export function Manifesto({ artists }: { artists: ArtistRef[] }) {
  return (
    <section
      aria-labelledby="manifesto-heading"
      className="grain relative overflow-hidden rounded-[32px] bg-scrim px-6 py-14 text-white sm:px-12 sm:py-16"
    >
      <Sparkle className="absolute top-10 left-[47%] hidden size-5 text-mint lg:block" />
      <Sparkle className="absolute bottom-12 left-[44%] hidden size-3.5 text-sky lg:block" />
      <HumanSeal id="manifesto-seal-path-sm" className="absolute top-5 right-5 w-20 lg:hidden" />

      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <HandNote tone="glow" className="-rotate-2 text-[1.75rem]">
            a little note from us ✎
          </HandNote>
          <h2
            id="manifesto-heading"
            className="mt-3 font-display text-[2.5rem] leading-[1.02] font-extrabold tracking-tight sm:text-[3.5rem]"
          >
            Made by humans
            <br />
            every single piece
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
            Every artwork here was drawn by a real person — their hands, their style, years of practice. When you
            commission, adopt or simply follow, you keep them drawing.
          </p>
          <p className="mt-3 font-hand text-[1.625rem] text-white/90">thank you for supporting artists (｡•ᴗ•｡)♡</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mira/commissions"
              className="inline-flex h-11 items-center gap-2 rounded-button bg-paper px-5 text-[0.9375rem] font-semibold text-on-paper transition hover:brightness-95"
            >
              Open your studio
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href="/explore/popular"
              className="inline-flex h-11 items-center rounded-button px-5 text-[0.9375rem] font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10"
            >
              Meet the artists
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6 sm:gap-x-10">
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Studios open</dt>
              <dd className="font-display text-2xl font-extrabold">{formatCompact(PULSE.openStudios)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Adopted this week</dt>
              <dd className="font-display text-2xl font-extrabold">{formatCompact(PULSE.adoptsThisWeek)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Platform fee</dt>
              <dd className="font-display text-2xl font-extrabold">0% for {FEE_FREE.months} months</dd>
            </div>
          </dl>
        </div>

        <div className="hidden lg:block">
          <ArtistBoard artists={artists} />
        </div>
      </div>
    </section>
  );
}
