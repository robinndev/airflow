"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { HeroPiece } from "@/lib/explore";
import { BlankCanvas } from "./blank-canvas";
import { PrintStack } from "./print-stack";

export type DeskPiece = HeroPiece & { glow: string[] };

/**
 * The art half of the desk. Signing in, it's a stack of the community's
 * prints; joining, it's your own blank canvas. Phones get a small fan of
 * prints tucked behind the sheet instead.
 */
export function DeskArt({ pieces }: { pieces: DeskPiece[] }) {
  const joining = usePathname().startsWith("/join");

  return (
    <>
      <div className="hidden animate-rise self-start pt-20 lg:sticky lg:top-3 lg:block" key={joining ? "canvas" : "prints"}>
        {joining ? <BlankCanvas /> : <PrintStack pieces={pieces} />}
      </div>
      <PrintFan pieces={pieces} />
    </>
  );
}

const FAN = [
  { rotate: -10, y: 18 },
  { rotate: 2, y: 0 },
  { rotate: 13, y: 14 },
];

function PrintFan({ pieces }: { pieces: DeskPiece[] }) {
  return (
    <div aria-hidden className="pointer-events-none relative -mb-14 flex h-32 justify-end pr-3 sm:pr-8 lg:hidden">
      {pieces.slice(0, FAN.length).map((piece, i) => (
        <span
          key={piece.id}
          className="relative -ml-7 block h-fit w-[5.5rem] rounded-[3px] bg-paper p-1 pb-4 shadow-lift sm:w-24"
          style={{ rotate: `${FAN[i].rotate}deg`, marginTop: FAN[i].y }}
        >
          <span className="relative block aspect-[4/5] overflow-hidden rounded-[2px]" style={{ backgroundColor: piece.image.palette?.[0] }}>
            <Image src={piece.image.src} alt="" fill sizes="96px" className="object-cover" />
          </span>
        </span>
      ))}
    </div>
  );
}
