"use client";

import Image from "next/image";
import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Tape } from "@/components/explore/doodles";
import { Lightbox } from "@/components/profile/post-media";
import { glowOf } from "@/lib/palette";
import type { ImageAsset } from "@/lib/profile/types";

/**
 * How the piece is hung, by stage:
 *   gallery    — finished work floats on the wall, lit in its own colors.
 *   drafting   — a WIP pinned to the drafting table, printer's crop marks around it.
 *   sketchbook — sketches stay in the spiral sketchbook, taped to dot paper.
 */
export type PlateVariant = "gallery" | "drafting" | "sketchbook";

// Tallest the plate gets, so a portrait piece never runs off the screen.
const MAX_HEIGHT: Record<PlateVariant, string> = {
  gallery: "min(78svh, 48rem)",
  drafting: "min(72svh, 44rem)",
  sketchbook: "min(60svh, 34rem)",
};

// Horizontal padding of the frame around the pieces (keep in sync with the frames below).
const INSET: Record<PlateVariant, string> = {
  gallery: "[--inset:0px]",
  drafting: "[--inset:40px] sm:[--inset:56px]",
  sketchbook: "[--inset:40px] sm:[--inset:64px]",
};

const TILT = ["-1.4deg", "1.1deg", "-0.6deg", "1.6deg"];

/** Up to four pieces as justified rows: equal heights, nothing cropped. */
function toRows(media: ImageAsset[]): ImageAsset[][] {
  return media.length === 4 ? [media.slice(0, 2), media.slice(2)] : [media];
}

export function ArtPlate({
  media,
  variant,
  align = "center",
  priority = false,
}: {
  media: ImageAsset[];
  variant: PlateVariant;
  /** Which side the plate hugs on wide screens (toward its label). */
  align?: "start" | "end" | "center";
  priority?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const pieces = media.slice(0, 4);
  const rows = toRows(pieces);

  function open(i: number) {
    setIndex(i);
    dialogRef.current?.showModal();
  }

  const justify = { start: "lg:items-start", end: "lg:items-end", center: "lg:items-center" }[align];
  // Index of each row's first piece, so every piece knows its place in the lightbox.
  const firsts = rows.map((_, r) => rows.slice(0, r).reduce((sum, row) => sum + row.length, 0));

  const grid = (
    <div className={`flex flex-col ${variant === "sketchbook" ? "gap-5" : "gap-3"}`}>
      {rows.map((row, r) => {
        const ratio = row.reduce((sum, img) => sum + img.width / img.height, 0);
        // Sized against the plate's column (cqw), not the frame around it, which shrinks to fit.
        const width = `min(100cqw - var(--inset), var(--plate-h) / ${rows.length} * ${ratio.toFixed(4)})`;
        return (
          <div key={r} className={`flex ${variant === "sketchbook" ? "gap-5" : "gap-3"}`} style={{ width }}>
            {row.map((image, j) => {
              const i = firsts[r] + j;
              return (
                <Piece
                  key={`${image.src}-${i}`}
                  image={image}
                  variant={variant}
                  tilt={TILT[i % TILT.length]}
                  tape={variant === "sketchbook" && i < 2 ? (i === 0 ? "mint" : "lilac") : undefined}
                  sizes={pieces.length === 1 ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 1024px) 420px, 50vw"}
                  priority={priority && i === 0}
                  onOpen={() => open(i)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`@container flex flex-col items-center ${INSET[variant]} ${justify}`}
      style={{ "--plate-h": MAX_HEIGHT[variant] } as CSSProperties}
    >
      {variant === "gallery" && grid}
      {variant === "drafting" && <Drafting pieces={pieces}>{grid}</Drafting>}
      {variant === "sketchbook" && <Sketchbook>{grid}</Sketchbook>}
      <Lightbox dialogRef={dialogRef} media={media} index={index} setIndex={setIndex} />
    </div>
  );
}

function Piece({
  image,
  variant,
  tilt,
  tape,
  sizes,
  priority,
  onOpen,
}: {
  image: ImageAsset;
  variant: PlateVariant;
  tilt: string;
  tape?: "mint" | "lilac";
  sizes: string;
  priority: boolean;
  onOpen: () => void;
}) {
  const ratio = image.width / image.height;
  const style = {
    // Grow factors scaled up: when they sum below 1, flexbox only hands out that fraction of the row.
    flex: `${(ratio * 100).toFixed(2)} 1 0%`,
    aspectRatio: `${image.width} / ${image.height}`,
    "--tilt": tilt,
    "--glow": glowOf(image.palette, 1)[0],
  } as CSSProperties;
  const frame = {
    gallery: "rounded-[10px] art-glow transition-[translate] duration-500 ease-out hover:-translate-y-1",
    drafting: "rounded-[4px] shadow-lift",
    sketchbook: "rounded-[3px] shadow-soft rotate-(--tilt) transition-[rotate] duration-500 hover:rotate-0",
  }[variant];

  return (
    <span className={`relative block min-w-0 ${frame}`} style={style}>
      {tape && <Tape tone={tape} className="-top-3 left-1/2 w-20 -translate-x-1/2 -rotate-3" />}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View full artwork: ${image.alt}`}
        className="group/piece relative block size-full cursor-zoom-in overflow-hidden rounded-[inherit]"
        style={{ backgroundColor: image.palette?.[0] }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={priority}
          className="object-cover transition-[scale] duration-700 ease-out group-hover/piece:scale-[1.015]"
        />
      </button>
    </span>
  );
}

/** Printer's crop marks at each corner, plus the canvas size like a print spec. */
function Drafting({ pieces, children }: { pieces: ImageAsset[]; children: ReactNode }) {
  const [first] = pieces;
  const mark = "pointer-events-none absolute size-5 border-ink/35";
  return (
    <figure className="relative w-fit max-w-full p-5 sm:p-7">
      <span aria-hidden className={`${mark} top-0 left-0 border-t border-l`} />
      <span aria-hidden className={`${mark} top-0 right-0 border-t border-r`} />
      <span aria-hidden className={`${mark} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden className={`${mark} right-0 bottom-0 border-r border-b`} />
      {children}
      {first && (
        <figcaption className="absolute right-7 -bottom-1.5 translate-y-full font-mono text-[0.6875rem] tracking-wider text-muted">
          W.I.P. · {pieces.length > 1 ? `${pieces.length} canvases` : `${first.width} × ${first.height}`}
        </figcaption>
      )}
    </figure>
  );
}

/** A spiral-bound page: wire loops through punched holes, art taped to dot paper. */
function Sketchbook({ children }: { children: ReactNode }) {
  const id = `coil-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div className="dot-paper relative w-fit max-w-full rounded-[6px] px-5 pt-10 pb-6 shadow-lift sm:px-8 sm:pt-12 sm:pb-8">
      <svg aria-hidden className="pointer-events-none absolute inset-x-4 -top-3 h-9 w-[calc(100%-2rem)]">
        <defs>
          <pattern id={id} width="22" height="36" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="24" r="3.6" className="fill-scrim/80" />
            <path d="M8 24C7 13 8 5 11 4s4 8 3 20" fill="none" strokeWidth="1.6" strokeLinecap="round" className="stroke-paper-muted" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      {children}
    </div>
  );
}
