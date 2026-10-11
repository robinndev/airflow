import Image from "next/image";
import { useId, type CSSProperties } from "react";
import { INK } from "@/components/explore/stamp";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * Studio mail: the paper pieces the messages are made of. People's pictures
 * are postage stamps, days are postmarks, unread letters still have their wax
 * seal. Pure markup and CSS (`postage`, `cancel-lines` in globals.css).
 */

/** Someone's picture as a postage stamp: paper with a perforated edge. */
export function PostageStamp({
  image,
  size,
  tilt = 0,
  className = "",
}: {
  image: ImageAsset;
  /** Width in px; stamps are a little taller than wide. */
  size: number;
  tilt?: number;
  className?: string;
}) {
  const width = size;
  const height = Math.round(size * 1.14);
  // Holes at least 7px apart, spaced to divide each side evenly.
  const gx = width / Math.max(2, Math.floor(width / 7));
  const gy = height / Math.max(2, Math.floor(height / 7));
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 drop-shadow-[0_1px_1.5px_rgb(var(--shadow-rgb)/0.28)] ${className}`}
      style={{ rotate: tilt ? `${tilt}deg` : undefined }}
    >
      <span
        className="postage block"
        style={{ width, height, "--gx": `${gx}px`, "--gy": `${gy}px` } as CSSProperties}
      >
        <Image
          src={image.src}
          alt=""
          width={width * 2}
          height={height * 2}
          className="size-full bg-ice object-cover"
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </span>
    </span>
  );
}

/** A round postmark: two rings, the day in the middle, the town on the rim. */
export function PostmarkRing({
  day,
  year,
  className = "",
}: {
  day: string;
  year?: string;
  className?: string;
}) {
  const rim = `rim${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className={`shrink-0 overflow-visible ${className}`}
      style={{ maskImage: INK, WebkitMaskImage: INK, maskSize: "120px 60px" }}
    >
      <defs>
        <path id={rim} d="M10 32a22 22 0 1 1 44 0" />
      </defs>
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="21.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <text fontSize="6.4" fontWeight="800" letterSpacing="1.6" fill="currentColor" className="font-display">
        <textPath href={`#${rim}`} startOffset="50%" textAnchor="middle">
          ARTIFLOW
        </textPath>
      </text>
      <text
        x="32"
        y={year ? 31 : 34}
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        letterSpacing=".6"
        fill="currentColor"
        className="font-display uppercase"
      >
        {day}
      </text>
      {year && (
        <text x="32" y="41" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" className="font-display">
          {year}
        </text>
      )}
      <path d="M9 50l4-2M51 14l4-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Day divider in a conversation: a postmark, its cancellation lines running out to both sides. */
export function Postmark({ label, day, year }: { label: string; day: string; year?: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-2 py-3 text-muted/55">
      <span className="cancel-lines h-[13px] flex-1" />
      <PostmarkRing day={day} year={year} className="size-12 -rotate-[8deg] text-muted/80" />
      <span className="cancel-lines h-[13px] flex-1" />
    </div>
  );
}

/** A small wax seal in the art's color: this letter hasn't been opened yet. */
export function Seal({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`tint-ink shrink-0 ${className}`}>
      <path
        d="M12 1.6c1.6 0 2.3 1.2 3.7 1.6s2.8-.2 3.8.9.4 2.4.9 3.8 1.9 2.2 1.9 4.1-1.4 2.6-1.9 4-.1 2.8-1.1 3.8-2.3.5-3.7 1-2 1.9-3.6 1.9-2.4-1.4-3.8-1.9-2.8 0-3.8-1-.4-2.4-.9-3.8S1.6 13.8 1.6 12s1.3-2.6 1.8-4 0-2.8 1-3.8 2.4-.5 3.8-1S10.4 1.6 12 1.6Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="black" strokeOpacity=".22" strokeWidth="1.2" />
      <path d="M12 8.6l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9Z" fill="white" fillOpacity=".55" />
      <path d="M6 8.6c1-2.3 3-3.7 5.3-4-1.7.9-3.3 2.2-4.2 4.4Z" fill="white" fillOpacity=".3" />
    </svg>
  );
}
