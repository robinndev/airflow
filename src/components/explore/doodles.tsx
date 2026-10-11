import type { ReactNode } from "react";

/*
 * Hand-made accents for Explore: tape, watercolor, pen strokes and notes.
 * They live in the margins and never sit on top of an artwork's subject —
 * the art stays the hero (blueprint §6). All strokes use `currentColor` or
 * theme tokens, so Aqua and Ember both work.
 */

const TAPE_TONES = {
  mint: "bg-mint/45",
  lilac: "bg-lilac/40",
  sky: "bg-sky/45",
} as const;

/**
 * A strip of washi tape with torn ends. Position it with `className`. `color`
 * (a hex from an artwork's palette) dyes it to match the art it holds.
 */
export function Tape({
  tone = "mint",
  color,
  className = "",
}: {
  tone?: keyof typeof TAPE_TONES;
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 block h-7 w-24 backdrop-blur-[1px] [clip-path:polygon(0%_10%,3%_0%,97%_5%,100%_16%,98%_34%,100%_52%,97%_70%,100%_88%,98%_100%,2%_95%,0%_78%,3%_60%,0%_42%,2%_25%)] ${color ? "" : TAPE_TONES[tone]} ${className}`}
      style={{
        backgroundColor: color && `color-mix(in oklab, ${color} 58%, transparent)`,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--paper) 55%, transparent) 0 1.5px, transparent 2px)",
        backgroundSize: "9px 9px",
      }}
    />
  );
}

/**
 * Watercolor wash: soft blobs whose edges are roughened by turbulence, like
 * pigment bleeding into wet paper. In Ember the same tokens glow instead.
 */
export function Wash({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
      overflow="visible"
      className={`pointer-events-none absolute ${className}`}
    >
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="70" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        <ellipse cx="470" cy="260" rx="215" ry="170" className="fill-sky opacity-25" />
        <ellipse cx="310" cy="370" rx="190" ry="130" className="fill-lilac opacity-20" />
        <ellipse cx="600" cy="440" rx="130" ry="95" className="fill-mint opacity-25" />
        <ellipse cx="360" cy="170" rx="110" ry="80" className="fill-ocean opacity-10" />
      </g>
    </svg>
  );
}

/** Marker underline that draws itself in. Size it by width; it keeps its proportions. */
export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 26" fill="none" className={`scribble-in ${className}`}>
      <path
        d="M4 16C46 7 98 5 142 9s58 6 74-1"
        pathLength={1}
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M20 21c52-6 112-7 186-4"
        pathLength={1}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".55"
      />
    </svg>
  );
}

/** Four-point sparkle, filled with currentColor. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none ${className}`}>
      <path
        fill="currentColor"
        d="M12 0c.8 7.2 4.8 11.2 12 12-7.2.8-11.2 4.8-12 12-.8-7.2-4.8-11.2-12-12C7.2 11.2 11.2 7.2 12 0Z"
      />
    </svg>
  );
}

const NOTE_TONES = {
  lilac: "text-lilac-ink",
  ocean: "text-ocean-ink",
  /** Brighter ocean for big strokes and for notes on paper. */
  accent: "text-ocean",
  mint: "text-mint-ink",
  muted: "text-muted",
  /** Captions written on paper (stickers, polaroids, tags). */
  paper: "text-paper-muted",
  /** On dark scrim panels. */
  glow: "text-mint",
} as const;

/** The artist's handwriting — short asides only, never essential info. */
export function HandNote({
  children,
  tone = "lilac",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof NOTE_TONES;
  className?: string;
}) {
  return (
    <span className={`inline-block font-hand text-[1.375rem] leading-none font-semibold ${NOTE_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
