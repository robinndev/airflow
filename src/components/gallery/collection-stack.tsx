import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Tape } from "@/components/explore/doodles";
import type { Collection } from "@/lib/gallery/types";

/*
 * A collection on the gallery: a stack of prints taped together, the cover
 * on top (never cropped), the next prints fanned out underneath in their own
 * colors, the title on a strip of tape.
 */

const TILTS = ["rotate-[5deg]", "-rotate-[4deg]"];

export function CollectionStack({ collection }: { collection: Collection }) {
  const { cover, pieces, title, description } = collection;
  const under = pieces.filter((p) => p.id !== collection.coverId).slice(0, 2);

  return (
    <li data-part="collection" className="list-none">
      <Link href={collection.href} className="group block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ocean">
        <div className="relative flex h-48 items-center justify-center sm:h-52">
          {cover ? (
            <span className="relative inline-block max-w-[calc(100%-2rem)]">
              {/* The next prints of the stack, the cover's size, fanned out underneath. */}
              {under.map((piece, i) => (
                <span
                  key={piece.id}
                  aria-hidden
                  className={`absolute inset-0 bg-paper shadow-soft transition-[rotate,translate] duration-500 ease-out ${TILTS[i]} ${i === 0 ? "group-hover:translate-x-2 group-hover:rotate-[8deg]" : "group-hover:-translate-x-2 group-hover:-rotate-[7deg]"}`}
                  style={{ backgroundColor: `color-mix(in oklab, ${piece.image.palette?.[0] ?? "var(--paper)"} 16%, var(--paper))` }}
                />
              ))}
              <span className="relative block bg-white p-1.5 shadow-lift transition-[translate] duration-500 group-hover:-translate-y-1">
                <Image
                  src={cover.src}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 60vw"
                  className="block h-auto max-h-40 w-auto max-w-full sm:max-h-44"
                  style={{ backgroundColor: cover.palette?.[0] }}
                />
                <Tape color={cover.palette?.[1]} tone="lilac" className="-top-3 left-1/2 w-20 -translate-x-1/2 -rotate-2" />
              </span>
            </span>
          ) : (
            <span className="relative grid h-36 w-32 place-items-center rounded-[3px] bg-paper font-hand text-xl text-paper-muted shadow-soft">
              empty
            </span>
          )}
        </div>
        <div className="mt-3 px-1">
          <p className="flex items-baseline justify-between gap-3">
            <span className="truncate font-display text-base font-extrabold text-ink">{title}</span>
            <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
              {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
            </span>
          </p>
          {description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{description}</p>}
        </div>
      </Link>
    </li>
  );
}

export function NewCollectionStack({ onClick }: { onClick: () => void }) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onClick}
        className="group flex h-48 w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border text-muted transition-colors hover:border-ocean hover:text-ocean sm:h-52"
      >
        <Plus aria-hidden className="size-7" />
        <span className="max-w-[12rem] text-center text-sm font-semibold text-balance">
          Group pieces: a series, studies, a project.
        </span>
      </button>
    </li>
  );
}
