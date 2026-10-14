import Link from "next/link";
import { HandNote, Sparkle } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { Avatar } from "@/components/ui/avatar";
import { sinceMonth, type PassData } from "@/lib/artists/codes";

/*
 * The Artist Pass: an artist alley exhibitor badge, on a lanyard, in a foil
 * frame (the theme's own iridescence, drifting). Your picture, your name,
 * your artist number (artists are numbered in the order they got in), since
 * when, and whose code let you in. It's the post you share when you become
 * an artist, and your pass on /codes. The foil stays on the frame; the card
 * is paper, so it reads the same in both themes.
 */

/** A barcode of the handle, so every pass has its own. */
function bars(seed: string) {
  let h = 2166136261;
  let x = 0;
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < 30; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i % seed.length) ^ i, 16777619);
    const w = (1 + ((h >>> 0) % 3)) * 0.9;
    if (i % 6 !== 5) out.push({ x, w });
    x += w + 0.9;
  }
  return out;
}

export const passNumber = (n?: number) => (n ? `No. ${String(n).padStart(4, "0")}` : "No. ——");

export function ArtistPass({ pass, size = "md", className = "" }: { pass: PassData; size?: "sm" | "md"; className?: string }) {
  const small = size === "sm";
  return (
    <figure
      data-part="artist-pass"
      aria-label={`${pass.name}'s Artist Pass, ${passNumber(pass.number)}`}
      className={`relative mx-auto ${small ? "w-[13.5rem]" : "w-[16.5rem]"} ${className}`}
    >
      {/* The lanyard and its clip. */}
      <svg aria-hidden viewBox="0 0 120 60" className={`mx-auto -mb-3 block ${small ? "h-10" : "h-14"} w-auto`}>
        <path d="M14 0 L52 48 M106 0 L68 48" strokeWidth="13" strokeLinecap="round" className="stroke-ocean" />
        <path d="M14 0 L52 48 M106 0 L68 48" strokeWidth="13" strokeLinecap="round" strokeDasharray="2 7" className="stroke-[color-mix(in_oklab,var(--paper)_70%,transparent)]" />
        <rect x="48" y="40" width="24" height="16" rx="4" className="fill-[color-mix(in_oklab,var(--muted)_70%,var(--paper))]" />
        <rect x="55" y="50" width="10" height="9" rx="2" className="fill-[color-mix(in_oklab,var(--muted)_85%,black)]" />
      </svg>

      <div className={`foil rounded-[22px] shadow-lift ${small ? "p-[5px]" : "p-[6px]"}`}>
        <div className={`grain relative rounded-[17px] bg-paper text-center text-on-paper ${small ? "px-4 pt-5 pb-4" : "px-5 pt-6 pb-5"}`}>
          {/* The slot it hangs from. */}
          <span aria-hidden className="absolute top-2.5 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-canvas/70 shadow-[inset_0_1px_2px_rgb(var(--shadow-rgb)/0.35)]" />
          <p className="mt-1 text-[0.5625rem] font-bold tracking-[0.22em] text-paper-muted uppercase">Artiflow · Artist pass</p>

          <div className="relative mx-auto mt-3 w-fit">
            <Avatar image={pass.avatar} size={small ? 72 : 96} className={`${small ? "size-18" : "size-24"} shadow-soft ring-4 ring-paper`} />
            <Sparkle className="absolute -top-1 -right-3 size-4 text-lilac" />
            <Sparkle className="absolute bottom-1 -left-3 size-3 text-sky" />
          </div>

          <p className={`mt-3 truncate font-display leading-tight font-extrabold tracking-tight ${small ? "text-lg" : "text-xl"}`}>{pass.name}</p>
          <p className="truncate text-sm text-paper-muted">@{pass.handle}</p>

          <Stamp tone={pass.verifiedAt ? "mint" : "lilac"} onPaper className="mt-3 -rotate-3">
            {pass.verifiedAt ? "✓ Verified artist" : "✦ Official artist"}
          </Stamp>

          <dl className="mt-4 grid grid-cols-2 gap-2 border-y-2 border-dashed border-paper-muted/25 py-2.5 text-left">
            <div>
              <dt className="text-[0.5625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">Artist</dt>
              <dd className="font-mono text-sm font-bold">{passNumber(pass.number)}</dd>
            </div>
            <div>
              <dt className="text-[0.5625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">Since</dt>
              <dd className="text-sm font-bold">{sinceMonth(pass.since)}</dd>
            </div>
          </dl>

          <HandNote tone="paper" className="mt-3 max-w-full -rotate-2 text-[1.0625rem] leading-tight [overflow-wrap:anywhere]">
            {pass.invitedBy ? (
              <>
                let in by{" "}
                <Link href={`/${pass.invitedBy}`} className="hover:underline">
                  @{pass.invitedBy}
                </Link>{" "}
                ♡
              </>
            ) : (
              "a founding artist ✦"
            )}
          </HandNote>

          <svg aria-hidden viewBox="0 0 100 14" preserveAspectRatio="none" className="mt-3 h-6 w-full text-on-paper/75">
            {bars(pass.handle).map((bar) => (
              <rect key={bar.x} x={bar.x} y="0" width={bar.w} height="14" fill="currentColor" />
            ))}
          </svg>
        </div>
      </div>
    </figure>
  );
}
