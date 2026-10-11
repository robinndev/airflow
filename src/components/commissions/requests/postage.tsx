import Image from "next/image";
import { INK } from "@/components/explore/stamp";
import type { ImageAsset } from "@/lib/profile/types";

// Perforated edges: a grid of holes, kept only in the padding ring (the content box stays solid).
const PERFORATION =
  "radial-gradient(4.5px at 4.5px 4.5px, #0000 97%, #000) -4.5px -4.5px / 12px 12px round, linear-gradient(#000 0 0) content-box";

/**
 * A postage stamp printed with the commission's art; the price is its value.
 * Perforated paper, a thin frame, the value in the corner.
 */
export function PostageStamp({ image, value, className = "" }: { image?: ImageAsset; value: string; className?: string }) {
  return (
    <span className={`block drop-shadow-[0_2px_3px_rgb(var(--shadow-rgb)/0.25)] ${className}`}>
      <span className="block bg-paper p-[4.5px]" style={{ mask: PERFORATION, WebkitMask: PERFORATION }}>
        <span className="block border border-on-paper/10 bg-paper p-[3px]">
          <span
            className="relative block aspect-[4/5] overflow-hidden bg-ice"
            style={{ backgroundColor: image?.palette?.[0] }}
          >
            {image && (
              <Image
                src={image.src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                style={{ objectPosition: image.focus ?? "50% 25%" }}
              />
            )}
            <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-1.5 pt-1 pb-4 text-right font-display text-[0.8125rem] leading-none font-extrabold text-white tabular-nums">
              {value}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

const TONE = {
  muted: "text-muted",
  lilac: "text-lilac-ink dark:text-lilac",
  mint: "text-mint-ink dark:text-mint",
  ocean: "text-ocean-ink dark:text-ocean",
  like: "text-like",
} as const;

export type PostmarkTone = keyof typeof TONE;

/**
 * A round postmark: the post office's name and the date around the ring, the
 * word in the middle, and wavy cancellation lines trailing off to the left.
 */
export function Postmark({
  id,
  word,
  date,
  tone,
  className = "",
}: {
  /** Unique on the page (it names the ring's text path). */
  id: string;
  word: string;
  date: string;
  tone: PostmarkTone;
  className?: string;
}) {
  const ring = `postmark-${id}`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 150 100"
      fill="none"
      className={`pointer-events-none ${TONE[tone]} ${className}`}
      style={{ maskImage: INK, WebkitMaskImage: INK, maskSize: "140px 70px", WebkitMaskSize: "140px 70px" }}
    >
      <defs>
        <path id={ring} d="M100 50m-35 0a35 35 0 1 1 70 0a35 35 0 1 1-70 0" />
      </defs>
      {/* Cancellation waves. */}
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".85">
        <path d="M2 34c8-5 16-5 24 0s16 5 24 0 16-5 24 0" />
        <path d="M2 46c8-5 16-5 24 0s16 5 24 0 16-5 24 0" />
        <path d="M2 58c8-5 16-5 24 0s16 5 24 0 16-5 24 0" />
        <path d="M2 70c8-5 16-5 24 0s16 5 24 0 16-5 24 0" />
      </g>
      <circle cx="100" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" fill="color-mix(in oklab, var(--paper) 35%, transparent)" />
      <circle cx="100" cy="50" r="27" stroke="currentColor" strokeWidth="1.5" />
      <text fill="currentColor" fontSize="9.5" fontWeight="800" letterSpacing="1.6">
        <textPath href={`#${ring}`} startOffset="2%">
          ARTIFLOW POST · {date.toUpperCase()} ·
        </textPath>
      </text>
      <text x="100" y="54" textAnchor="middle" fill="currentColor" fontSize={word.length > 6 ? 9 : 11} fontWeight="900" letterSpacing="1">
        {word.toUpperCase()}
      </text>
    </svg>
  );
}
