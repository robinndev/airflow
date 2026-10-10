"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play, RotateCw } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { HandNote, Sparkle, Tape } from "@/components/explore/doodles";
import { HumanSeal } from "@/components/explore/human-seal";
import { PaletteChips } from "@/components/feed/palette-chips";
import { Pencil } from "./desk-props";
import { lightDesk } from "./light";
import type { DeskPiece } from "./desk-art";

const INTERVAL_MS = 6500;
const SHUFFLE_MS = 950;

// Where each print lies by its depth in the stack (0 = on top).
const POSES = [
  "translate(0, 0) rotate(-2deg)",
  "translate(6%, 2.5%) rotate(4deg)",
  "translate(-6%, 4%) rotate(-6.5deg)",
];
const poseAt = (depth: number) => POSES[Math.min(depth, POSES.length - 1)] + (depth >= POSES.length ? " scale(0.94)" : "");

/**
 * Community art on the desk: a stack of signed prints. Every few seconds the
 * top one is pulled off and slipped under the rest, and the desk takes its
 * light. Pauses on hover/focus, on request, and for reduced motion.
 */
export function PrintStack({ pieces }: { pieces: DeskPiece[] }) {
  const [order, setOrder] = useState(() => pieces.map((_, i) => i));
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const top = pieces[order[0]];

  const shuffle = () => {
    setLeaving(order[0]);
    setOrder((current) => [...current.slice(1), current[0]]);
  };

  useEffect(() => {
    lightDesk(top.glow);
  }, [top]);

  useEffect(() => () => lightDesk(null), []);

  useEffect(() => {
    if (paused || hovered || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(shuffle, INTERVAL_MS);
    return () => window.clearTimeout(timer);
    // `shuffle` only reads `order`, which re-arms the timer anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, paused, hovered]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), SHUFFLE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <section
      aria-label="Art on the desk"
      className="relative mx-auto w-full max-w-[460px]"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <HandNote tone="ocean" className="absolute -top-9 right-2 rotate-[4deg] text-[1.5rem]">
        art by real people ↓
      </HandNote>
      <HumanSeal id="desk-seal-path" className="absolute -top-8 -left-10 z-[70] w-24 -rotate-12" />
      <Sparkle className="absolute top-[18%] -right-8 size-5 text-mint" />
      <Sparkle className="absolute bottom-[30%] -left-9 size-3.5 text-lilac" />

      <button
        type="button"
        onClick={shuffle}
        aria-label={`Next piece (now showing ${top.title} by ${top.artist.name})`}
        className="@container relative block aspect-[5/6] w-full rounded-card"
      >
        {pieces.map((piece, i) => {
          const depth = order.indexOf(i);
          const isLeaving = leaving === i;
          const hidden = depth >= POSES.length;
          const ratio = piece.image.width / piece.image.height;
          return (
            <span
              key={piece.id}
              aria-hidden
              className="absolute inset-0 grid place-items-center"
              style={
                {
                  zIndex: 50 - depth,
                  transform: poseAt(depth),
                  opacity: hidden && !isLeaving ? 0 : 1,
                  transition: `transform 0.8s cubic-bezier(.3,.7,.2,1), opacity 0.3s ${hidden ? "0.8s" : "0s"}`,
                  "--pose-from": poseAt(0),
                  "--pose": poseAt(depth),
                  animation: isLeaving ? `print-shuffle ${SHUFFLE_MS}ms cubic-bezier(.5,0,.3,1) both` : undefined,
                } as CSSProperties
              }
            >
              <span className="relative block rounded-[5px] bg-paper p-[3.5cqw] pb-[11cqw] shadow-lift">
                {depth === 0 && <Tape tone="mint" className="-top-3.5 left-1/2 -translate-x-1/2 -rotate-3" />}
                <span
                  className="relative block overflow-hidden rounded-[2px]"
                  style={{
                    aspectRatio: `${piece.image.width} / ${piece.image.height}`,
                    width: `min(84cqw, calc(96cqw * ${ratio.toFixed(4)}))`,
                    backgroundColor: piece.image.palette?.[0],
                  }}
                >
                  <Image
                    src={piece.image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 400px, 50vw"
                    preload={i === 0}
                    className="object-cover"
                  />
                </span>
                {/* Signed in pencil under the image, the way prints are: edition, title, artist. */}
                <span className={`absolute inset-x-[3.5cqw] bottom-[2.6cqw] flex items-baseline justify-between gap-3 transition-opacity duration-500 ${depth === 0 ? "opacity-100" : "opacity-0"} font-hand text-[clamp(1rem,4.6cqw,1.375rem)] leading-none text-paper-muted`}>
                  <span className="tabular-nums">
                    {i + 1}/{pieces.length}
                  </span>
                  <span className="truncate italic">{piece.title}</span>
                  <span className="shrink-0 text-on-paper/80">{piece.artist.name}</span>
                </span>
              </span>
            </span>
          );
        })}
      </button>

      <Pencil className="absolute top-[46%] -right-[30%] z-[60] w-[64%] rotate-[104deg]" />

      <div className="relative z-[70] mt-12 flex items-center gap-3">
        <PaletteChips colors={top.image.palette ?? []} />
        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          <span className="font-semibold text-ink">{top.title}</span> by{" "}
          <Link href={top.href} className="font-semibold text-ocean-ink hover:underline">
            @{top.artist.handle}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink [&_svg]:size-3.5"
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
        <button
          type="button"
          onClick={shuffle}
          aria-label="Next piece"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink [&_svg]:size-3.5"
        >
          <RotateCw aria-hidden />
        </button>
      </div>
      <p role="status" className="sr-only">
        Now showing {top.title} by {top.artist.name}
      </p>
    </section>
  );
}
