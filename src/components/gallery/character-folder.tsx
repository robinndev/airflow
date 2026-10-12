import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Stamp } from "@/components/explore/stamp";
import { formatUsd } from "@/lib/format";
import type { Character } from "@/lib/gallery/types";
import { PaperClip } from "./paper";

/*
 * A character on the gallery's shelf: their file. A paper folder with their
 * name on the index tab, dyed in their colors, the cover clipped to the front
 * (never cropped) and the other sheets of the file showing behind it.
 */

const tint = (color: string | undefined, amount: number) =>
  color ? `color-mix(in oklab, ${color} ${amount}%, var(--paper))` : undefined;

export function CharacterFolder({ character, priority = false }: { character: Character; priority?: boolean }) {
  const { name, cover, palette, art, species, pronouns, adoptable } = character;
  const [main, second, third] = palette;
  const facts = [species, pronouns].filter(Boolean).join(" · ");

  return (
    <li data-part="character" className="list-none">
      <Link
        href={character.href}
        className="group relative block pt-7 outline-none focus-visible:[&_.folder]:ring-2 focus-visible:[&_.folder]:ring-ocean"
      >
        {/* The index tab carries the name. */}
        <span
          className="absolute top-0 left-3 z-[1] flex h-8 max-w-[75%] items-center gap-1.5 rounded-t-[10px] bg-paper px-3 font-display text-[0.9375rem] font-extrabold text-on-paper"
          style={{ backgroundColor: tint(main, 34), boxShadow: `inset 0 3px 0 ${main ?? "transparent"}` }}
        >
          <span className="truncate">{name}</span>
        </span>

        {/* The rest of the file, sticking out of the top of the folder. */}
        <span
          aria-hidden
          className="absolute top-1.5 right-5 left-[46%] h-16 rotate-[4deg] rounded-[3px] bg-paper shadow-soft transition-[rotate,translate] duration-500 group-hover:-translate-y-1.5 group-hover:rotate-[6deg]"
          style={{ backgroundColor: tint(second, 48) }}
        />
        <span
          aria-hidden
          className="absolute top-3 right-11 left-[38%] h-16 -rotate-[2deg] rounded-[3px] bg-paper shadow-soft transition-[rotate,translate] duration-500 group-hover:-translate-y-1 group-hover:-rotate-[3.5deg]"
          style={{ backgroundColor: tint(third, 36) }}
        />

        <div
          className="folder grain relative rounded-[6px_16px_16px_16px] bg-paper px-4 pt-4 pb-3.5 text-on-paper shadow-soft transition-[translate,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lift"
          style={{ backgroundColor: tint(main, 34) }}
        >
          <div className="relative flex h-52 items-center justify-center sm:h-56">
            {cover ? (
              <span className="relative block -rotate-[1.2deg] bg-white p-1.5 shadow-lift transition-[rotate] duration-500 group-hover:rotate-0">
                <Image
                  src={cover.src}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  preload={priority}
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                  className="block h-auto max-h-44 w-auto max-w-full sm:max-h-48"
                  style={{ backgroundColor: cover.palette?.[0] }}
                />
                <PaperClip className="absolute -top-4 left-4 h-9 text-paper-muted" />
              </span>
            ) : (
              <span className="grid size-28 place-items-center rounded-full border-2 border-dashed border-paper-muted/40 font-hand text-xl text-paper-muted">
                no art yet
              </span>
            )}
          </div>

          <div className="relative mt-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {facts && <p className="truncate text-xs font-semibold text-paper-muted">{facts}</p>}
              <p className="mt-0.5 text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase">
                {art.length} {art.length === 1 ? "piece" : "pieces"}
              </p>
            </div>
            {palette.length > 0 && (
              <span aria-hidden className="flex shrink-0 overflow-hidden rounded-full ring-2 ring-paper">
                {palette.slice(0, 5).map((color) => (
                  <span key={color} className="h-3.5 w-3" style={{ backgroundColor: color }} />
                ))}
              </span>
            )}
          </div>

          {adoptable && (
            <span className="absolute -top-3 right-3 rotate-[4deg]">
              {adoptable.status === "sold" ? (
                <Stamp tone="like" onPaper className="bg-paper">
                  Adopted ♥
                </Stamp>
              ) : (
                <span className="inline-flex flex-col items-center rounded-[8px] bg-paper px-2.5 py-1 text-center shadow-soft ring-1 ring-paper-muted/20">
                  <span className="text-[0.5625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">
                    {adoptable.status === "reserved" ? "On hold" : "Adopt me"}
                  </span>
                  <span className="font-display text-base leading-tight font-extrabold">{formatUsd(adoptable.priceUsd)}</span>
                </span>
              )}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/** The owner's empty folder: "make a page for your OC". */
export function NewCharacterFolder({ onClick }: { onClick: () => void }) {
  return (
    <li className="list-none">
      <button type="button" onClick={onClick} className="group relative block w-full pt-7 text-left">
        <span className="absolute top-0 left-3 flex h-8 items-center rounded-t-[10px] border-2 border-b-0 border-dashed border-border px-3 font-display text-[0.9375rem] font-extrabold text-muted">
          New character
        </span>
        <span className="flex h-[17.5rem] flex-col items-center justify-center gap-2 rounded-[6px_16px_16px_16px] border-2 border-dashed border-border text-muted transition-colors group-hover:border-ocean group-hover:text-ocean sm:h-[19.5rem]">
          <Plus aria-hidden className="size-7" />
          <span className="max-w-[12rem] text-center text-sm font-semibold text-balance">
            Give your OC a page: their design, outfits, story.
          </span>
        </span>
      </button>
    </li>
  );
}
