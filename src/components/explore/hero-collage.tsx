import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { HeroPiece } from "@/lib/explore";
import { HandNote, Sparkle, Tape } from "./doodles";
import { HumanSeal } from "./human-seal";

type Slot = {
  left: number;
  top: number;
  width: number;
  rotate: number;
  z: number;
  sizes: string;
  tape?: { tone: "mint" | "lilac" | "sky"; className: string };
};

// Positions in % of the stage (aspect 600 × 580), tuned for the five hero pieces.
const SLOTS: Slot[] = [
  { left: 21, top: 5, width: 41, rotate: -2.5, z: 20, sizes: "(min-width: 1024px) 250px, 42vw", tape: { tone: "mint", className: "-top-3 left-1/2 -translate-x-1/2 -rotate-6" } },
  { left: 59, top: 0, width: 37, rotate: 3, z: 10, sizes: "(min-width: 1024px) 230px, 38vw", tape: { tone: "lilac", className: "-top-2 -right-6 w-20 rotate-[38deg]" } },
  { left: 0, top: 43, width: 29, rotate: -5, z: 30, sizes: "(min-width: 1024px) 180px, 30vw", tape: { tone: "sky", className: "-top-2 -left-6 w-20 -rotate-[34deg]" } },
  { left: 41, top: 67, width: 25, rotate: 4, z: 40, sizes: "(min-width: 1024px) 160px, 26vw" },
  { left: 70, top: 58, width: 27, rotate: -3, z: 30, sizes: "(min-width: 1024px) 170px, 28vw", tape: { tone: "mint", className: "-top-3 right-3 w-16 rotate-[8deg]" } },
];

/**
 * Salon-style wall of five pieces, each mounted on a paper mat. Pieces
 * straighten and lift on hover and reveal who made them.
 */
export function HeroCollage({ pieces }: { pieces: HeroPiece[] }) {
  const featured = pieces[1];

  return (
    <div className="relative aspect-600/580 w-full">
      <HumanSeal id="hero-seal-path" className="absolute top-[7%] left-[0.5%] w-[20%]" />

      {pieces.slice(0, SLOTS.length).map((piece, i) => {
        const slot = SLOTS[i];
        return (
          <Link
            key={piece.id}
            href={piece.href}
            className="group/frame absolute block rounded-[18px] bg-paper p-[5px] shadow-lift transition-[rotate,scale,box-shadow] duration-500 ease-out rotate-(--r) hover:z-50 hover:scale-[1.04] hover:shadow-[0_24px_60px_rgb(var(--shadow-rgb)/0.22)] hover:rotate-0 focus-visible:z-50 focus-visible:rotate-0 sm:p-1.5"
            style={
              {
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.width}%`,
                zIndex: slot.z,
                "--r": `${slot.rotate}deg`,
              } as CSSProperties
            }
          >
            {slot.tape && <Tape tone={slot.tape.tone} className={slot.tape.className} />}
            <span
              className="relative block overflow-hidden rounded-[13px]"
              style={{
                aspectRatio: `${piece.image.width} / ${piece.image.height}`,
                backgroundColor: piece.image.palette?.[0],
              }}
            >
              <Image
                src={piece.image.src}
                alt={piece.image.alt}
                fill
                sizes={slot.sizes}
                preload={i === 0}
                className="object-cover"
              />
            </span>
            <span className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] translate-y-1 items-center gap-1.5 rounded-full bg-paper/95 py-1 pr-2.5 pl-1 text-xs font-semibold text-on-paper opacity-0 shadow-soft transition duration-300 group-hover/frame:translate-y-0 group-hover/frame:opacity-100 group-focus-visible/frame:translate-y-0 group-focus-visible/frame:opacity-100">
              <Image
                src={piece.artist.avatar.src}
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-full object-cover"
                style={{ objectPosition: piece.artist.avatar.focus }}
              />
              <span className="truncate">
                {piece.title} · @{piece.artist.handle}
              </span>
            </span>
          </Link>
        );
      })}

      {featured && (
        <div className="pointer-events-none absolute top-[45.5%] left-[62%] z-40 hidden w-[36%] sm:block">
          <HandNote className="-rotate-3 text-[1.25rem]">
            ↑ @{featured.artist.handle} has slots open!
          </HandNote>
        </div>
      )}

      <Sparkle className="absolute top-[2%] left-[24%] size-5 text-mint" />
      <Sparkle className="absolute top-[38%] left-[3%] size-3.5 text-lilac" />
      <Sparkle className="absolute right-[1%] bottom-[2%] size-6 text-sky" />
      <Sparkle className="absolute bottom-[6%] left-[33%] size-3 text-ocean" />
    </div>
  );
}
