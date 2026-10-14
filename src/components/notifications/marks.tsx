import Image from "next/image";
import type { ReactNode } from "react";
import { INK, Stamp } from "@/components/explore/stamp";
import type { NotificationKind, RequestStatus } from "@/lib/notifications/types";
import { glowOf } from "@/lib/palette";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * The guest book's hand-made marks. Notices are printed on paper (light in
 * both themes), so everything here uses the paper tokens, or the art's own
 * colors deepened toward the paper's ink: hue from the art, contrast from
 * the paper. Purely decorative pieces are aria-hidden; the sentence beside
 * them always says what happened.
 */

/** A hex from an artwork as ink on paper: its hue, with lightness and chroma an ink would have. */
export const inkOf = (hex: string) => `oklch(from ${hex} clamp(0.42, l, 0.6) max(c, 0.11) h)`;

/** Small deterministic wobble per notice, so marks never line up like a grid. */
export function tilt(id: string, range = 3) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 100) / 100) * range * 2 - range;
}

/** Each kind's pen color, on paper (Ember's pale "-ink" tones lose contrast there; its base colors read better). */
export const KIND_INK: Record<NotificationKind, string> = {
  welcome: "text-ocean-ink dark:text-ocean",
  like: "text-like",
  comment: "text-mint-ink dark:text-mint",
  reply: "text-mint-ink dark:text-mint",
  mention: "text-lilac-ink dark:text-lilac",
  follow: "text-ocean-ink dark:text-ocean",
  repost: "text-sky-ink dark:text-sky",
  invite_joined: "text-lilac-ink dark:text-lilac",
  commission_request: "text-ocean-ink dark:text-ocean",
  request_update: "text-ocean-ink dark:text-ocean",
  became_artist: "text-lilac-ink dark:text-lilac",
  artist_codes: "text-lilac-ink dark:text-lilac",
  verified: "text-mint-ink dark:text-mint",
};

const HEART = "M12 20.6c-.5 0-7.7-4.4-9.5-9C1 7.9 3.1 4.1 6.8 4.1c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.7 0 5.8 3.8 4.3 7.5-1.8 4.6-9 9-9.5 9z";
const HEART_SPOTS = [
  { x: 1, y: 9, r: -14, s: 1 },
  { x: 17, y: 2, r: 11, s: 0.84 },
  { x: 11, y: 21, r: -3, s: 0.7 },
];

/**
 * Likes, as heart stamps pressed in the artwork's colors: one per like, up to
 * three, the way a fan stamps a guest book. Never anyone's name.
 */
export function HeartStamps({ palette, tally, className = "" }: { palette?: string[]; tally: number; className?: string }) {
  const inks = glowOf(palette ?? [], 3);
  return (
    <svg
      aria-hidden
      viewBox="0 0 44 44"
      className={`size-11 overflow-visible ${className}`}
      style={{ maskImage: INK, WebkitMaskImage: INK, maskSize: "70px 35px" }}
    >
      {HEART_SPOTS.slice(0, Math.min(tally, 3)).map((spot, i) => {
        const color = inks[i] ? inkOf(inks[i]) : "var(--like)";
        return (
          <g key={i} transform={`translate(${spot.x} ${spot.y}) rotate(${spot.r} 12 12) scale(${spot.s})`}>
            <path d={HEART} fill={color} fillOpacity={0.88} />
            {/* The rubber stamp's carved inner line. */}
            <path d={HEART} fill="none" stroke="var(--paper)" strokeWidth={1.1} transform="translate(3.6 3.4) scale(0.7)" opacity={0.75} />
          </g>
        );
      })}
    </svg>
  );
}

/** A quick pen circle around someone's picture, like circling a face in a yearbook. */
export function PenCircle({ className = "", rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      fill="none"
      className={`pointer-events-none absolute -inset-1.5 overflow-visible ${className}`}
      style={{ rotate: `${rotate}deg` }}
    >
      <path
        d="M35 5.5C18.5 3.8 5.2 15 5.8 32.4c.6 16 12.7 26.6 27.9 26 15.6-.6 25.6-12.8 24.6-28.4C57.3 14.6 45.8 4.6 29.6 6.8c-5.3.8-9.4 3-12.6 6.3"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A small print of the piece, held by a strip of tape dyed in its colors.
 * `framed`: hung in a frame on a wire instead (a repost hangs your piece on
 * someone else's wall). Sized to the art, so it's never cropped.
 */
export function Print({ image, framed = false, rotate = 0, box = 52 }: { image: ImageAsset; framed?: boolean; rotate?: number; box?: number }) {
  const ratio = image.width / image.height;
  const width = Math.max(30, Math.round(ratio >= 1 ? box : box * ratio));
  const height = Math.max(30, Math.round(ratio >= 1 ? box / ratio : box));
  const tape = glowOf(image.palette ?? [], 1)[0];

  return (
    <span aria-hidden className="relative block shrink-0" style={{ rotate: `${rotate}deg` }}>
      {framed ? (
        <>
          {/* The wire and the nail. */}
          <svg viewBox="0 0 40 14" className="absolute -top-3 left-1/2 h-3.5 w-10 -translate-x-1/2 text-paper-muted" fill="none">
            <path d="M3 14 20 2.5 37 14" stroke="currentColor" strokeWidth={1} />
            <circle cx="20" cy="2.5" r="2" fill="currentColor" />
          </svg>
          <span className="block rounded-xs border-[3px] border-on-paper/80 bg-paper p-0.75 shadow-[0_2px_5px_rgb(var(--shadow-rgb)/0.28)]">
            <Image src={image.src} alt="" width={width} height={height} sizes="64px" className="block object-cover" style={{ width, height }} />
          </span>
        </>
      ) : (
        <>
          <span className="block bg-white p-0.75 shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.28)]">
            <Image src={image.src} alt="" width={width} height={height} sizes="64px" className="block object-cover" style={{ width, height }} />
          </span>
          <span
            className="absolute -top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 -rotate-6 [clip-path:polygon(0%_15%,4%_0%,96%_8%,100%_22%,97%_50%,100%_80%,96%_100%,3%_92%,0%_70%,3%_45%)]"
            style={{ backgroundColor: tape ? `color-mix(in oklab, ${tape} 55%, transparent)` : "color-mix(in oklab, var(--mint) 45%, transparent)" }}
          />
        </>
      )}
    </span>
  );
}

const STATUS_STAMP: Record<RequestStatus, { label: string; tone: "mint" | "lilac" | "like" | "muted" | "ocean" }> = {
  pending: { label: "New", tone: "ocean" },
  accepted: { label: "Accepted", tone: "mint" },
  waitlisted: { label: "Waitlist", tone: "lilac" },
  declined: { label: "Declined", tone: "like" },
  cancelled: { label: "Cancelled", tone: "muted" },
  quoted: { label: "Quote", tone: "lilac" },
  paid: { label: "Paid", tone: "mint" },
  in_progress: { label: "Started", tone: "ocean" },
  delivered: { label: "Delivered", tone: "mint" },
  expired: { label: "Expired", tone: "muted" },
};

/** A commission request, tucked into the book as a perforated ticket stub. */
export function RequestTicket({ estimateUsd, status, rotate = 0 }: { estimateUsd?: number; status: RequestStatus; rotate?: number }) {
  const stamp = status !== "pending" ? STATUS_STAMP[status] : null;
  return (
    <span aria-hidden className="relative block shrink-0" style={{ rotate: `${rotate}deg` }}>
      <span
        className="flex h-17 w-14 flex-col items-center justify-between bg-ocean/12 py-2 pl-1 text-ocean-ink shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.2)] dark:text-ocean"
        style={{
          // Perforations down the left edge, where it was torn off the pad.
          maskImage: "radial-gradient(circle at 0 6px, transparent 2.2px, black 2.6px)",
          maskSize: "100% 12px",
          WebkitMaskImage: "radial-gradient(circle at 0 6px, transparent 2.2px, black 2.6px)",
          WebkitMaskSize: "100% 12px",
        }}
      >
        <span className="text-[0.5rem] font-bold tracking-[0.18em] uppercase">Request</span>
        <span className="font-display text-base leading-none font-extrabold">
          {estimateUsd ? `$${Math.round(estimateUsd)}` : "✎"}
        </span>
        <span className="h-px w-8 border-t border-dashed border-current opacity-50" />
      </span>
      {stamp && (
        <Stamp tone={stamp.tone} onPaper className="absolute -bottom-2 left-1/2 -translate-x-1/2 -rotate-12 bg-paper/80 text-[0.5rem]">
          {stamp.label}
        </Stamp>
      )}
    </span>
  );
}

/** The artist's answer on your request, as a rubber stamp. */
export function StatusStamp({ status, rotate = -8 }: { status: RequestStatus; rotate?: number }) {
  const stamp = STATUS_STAMP[status];
  return (
    <span aria-hidden className="block shrink-0" style={{ rotate: `${rotate}deg` }}>
      <Stamp tone={stamp.tone} onPaper>
        {stamp.label}
      </Stamp>
    </span>
  );
}

/** Someone came in on your invite: the stub of an "admit one" ticket. */
export function AdmitOne({ rotate = 0 }: { rotate?: number }) {
  return (
    <span
      aria-hidden
      className="grid h-10 w-15 shrink-0 place-items-center bg-lilac/15 text-center font-display text-[0.5625rem] leading-[1.15] font-extrabold tracking-[0.16em] text-lilac-ink uppercase shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.18)] dark:text-lilac"
      style={{
        rotate: `${rotate}deg`,
        maskImage: "radial-gradient(circle at 0 50%, transparent 5px, black 5.5px), radial-gradient(circle at 100% 50%, transparent 5px, black 5.5px)",
        maskComposite: "intersect",
        WebkitMaskImage: "radial-gradient(circle at 0 50%, transparent 5px, black 5.5px), radial-gradient(circle at 100% 50%, transparent 5px, black 5.5px)",
        WebkitMaskComposite: "source-in",
      }}
    >
      Admit
      <br />
      one
    </span>
  );
}

/** A tiny Artist Pass: lilac, on a lanyard clip, with your artist number. */
export function PassStub({ number, verified = false, rotate = 0 }: { number?: number; verified?: boolean; rotate?: number }) {
  return (
    <span aria-hidden className="relative flex h-16 w-12 shrink-0 flex-col items-center" style={{ rotate: `${rotate}deg` }}>
      <span className="h-2.5 w-3 rounded-t-[3px] bg-muted/70" />
      <span className="foil -mt-px flex w-full flex-1 flex-col items-center justify-center rounded-[7px] p-[3px] shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.2)]">
        <span className="flex w-full flex-1 flex-col items-center justify-center rounded-[5px] bg-paper font-display leading-none">
          <span className="text-[0.4375rem] font-extrabold tracking-[0.16em] text-lilac-ink uppercase dark:text-lilac">Artist</span>
          <span className="mt-1 font-mono text-[0.5625rem] font-bold text-on-paper/75">{verified ? "✓" : number ? `No.${number}` : "✦"}</span>
        </span>
      </span>
    </span>
  );
}

/** A day's heading, rubber-stamped in the margin like a guest book's date column. */
export function DateStamp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Stamp tone="muted" onPaper className={`-rotate-2 text-[0.5625rem] ${className}`}>
      {children}
    </Stamp>
  );
}

/** The cloth ribbon that marks your page. */
export function Ribbon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute block w-4 bg-ocean [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)] ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgb(0 0 0 / 0.16), transparent 30%, rgb(255 255 255 / 0.18) 50%, transparent 70%, rgb(0 0 0 / 0.16)), repeating-linear-gradient(0deg, transparent 0 3px, rgb(0 0 0 / 0.05) 3px 4px)",
      }}
    />
  );
}

/** A corner ornament for the bookplate. */
function Fleuron({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`absolute size-3.5 text-paper-muted ${className}`} fill="currentColor">
      <path d="M8 1.5c.7 2.4 2.1 3.8 4.5 4.5-2.4.7-3.8 2.1-4.5 4.5-.7-2.4-2.1-3.8-4.5-4.5C5.9 5.3 7.3 3.9 8 1.5z" opacity={0.8} />
      <circle cx="8" cy="13.5" r="1" />
    </svg>
  );
}

/**
 * The first page of every guest book: an ex libris with the owner's name.
 * It's the welcome note, so it sits at the very end of the list (the oldest).
 */
export function Bookplate({
  name,
  handle,
  since,
  children,
  className = "",
}: {
  name: string;
  handle: string;
  /** "October 2026" */
  since?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative rotate-[-0.6deg] border border-on-paper/25 p-1.5 ${className}`}>
      <div className="relative border-2 border-on-paper/20 px-5 py-4 text-center">
        <Fleuron className="top-1 left-1" />
        <Fleuron className="top-1 right-1 rotate-90" />
        <Fleuron className="right-1 bottom-1 rotate-180" />
        <Fleuron className="bottom-1 left-1 -rotate-90" />
        {/* A brush crossed with a pen, engraved. */}
        <svg aria-hidden viewBox="0 0 48 24" className="mx-auto h-5 w-10 text-paper-muted" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
          <path d="M8 20 34 4" />
          <path d="M34 4c2.5-1.6 5.5-1 6 .5.5 1.6-1.6 3.4-4.4 3.9" />
          <path d="M40 20 14 4" />
          <path d="M14 4 11 2.2M40 20l2.2 1.6" />
          <path d="M6 22c4 0 8-1 10-3" opacity={0.6} />
        </svg>
        <p className="mt-1.5 text-[0.5625rem] font-bold tracking-[0.32em] text-paper-muted uppercase">Ex libris</p>
        <p className="mt-1 font-display text-lg leading-tight font-extrabold text-on-paper">{name}</p>
        <p className="text-xs text-paper-muted">
          @{handle}
          {since && ` · since ${since}`}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * Tally marks in pencil, in fives, the way you count visitors at a table.
 * Counts past `max` show the first `max` strokes; the number beside says the rest.
 */
export function TallyMarks({ count, max = 25, className = "" }: { count: number; max?: number; className?: string }) {
  const shown = Math.min(count, max);
  const groups = Math.ceil(shown / 5);
  if (shown === 0) return <span className={`text-sm text-paper-muted ${className}`}>—</span>;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${groups * 30} 26`}
      className={`scribble-in h-6 overflow-visible ${className}`}
      style={{ width: groups * 30 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
    >
      {Array.from({ length: groups }, (_, g) => {
        const strokes = Math.min(5, shown - g * 5);
        const x = g * 30;
        return (
          <g key={g}>
            {Array.from({ length: Math.min(strokes, 4) }, (_, i) => {
              const wobble = ((g * 7 + i * 3) % 5) * 0.35;
              return <path key={i} pathLength={1} d={`M${x + 4 + i * 5 + wobble} ${4 + wobble} L${x + 3.5 + i * 5} ${22 - wobble}`} />;
            })}
            {strokes === 5 && <path pathLength={1} d={`M${x} ${17} L${x + 24} ${7.5}`} />}
          </g>
        );
      })}
    </svg>
  );
}

/** The guest book's pen, tied to the book with a coiled cord. */
export function TetheredPen({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 170" fill="none" className={`pointer-events-none ${className}`}>
      <path
        d="M10 0c0 8 12 6 12 14S10 22 10 30s12 6 12 14-12 8-12 16 12 6 12 14-12 8-12 16 12 6 12 14c0 6-2 10 4 16"
        className="stroke-paper-muted"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <g transform="translate(22 112) rotate(-24)">
        <rect x="0" y="0" width="11" height="44" rx="3" className="fill-ocean" />
        <rect x="0" y="0" width="11" height="9" rx="3" className="fill-on-paper" opacity={0.85} />
        <rect x="8.5" y="2" width="2" height="18" rx="1" className="fill-paper" opacity={0.7} />
        <path d="M1 44h9l-3.2 9.5c-.4 1.2-2.2 1.2-2.6 0z" className="fill-on-paper" opacity={0.75} />
        <path d="M3 4.5h5" className="stroke-paper" strokeWidth={1} opacity={0.6} />
      </g>
    </svg>
  );
}
