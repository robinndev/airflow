"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useFavorite } from "@/components/favorites/store";
import { Lightbox } from "@/components/profile/post-media";
import { formatCompact, formatUsd } from "@/lib/format";
import type { Piece } from "@/lib/gallery/types";
import type { ArtworkKind } from "@/lib/profile/types";

/*
 * Pieces hung in justified rows: every piece keeps its own shape (nothing is
 * cropped), rows fill the width. Click opens the lightbox; the heart saves
 * to the viewer's moodboard. The owner's "…" menu comes in through `menu`.
 */

type Filter = "all" | ArtworkKind;

const FILTERS: Record<Filter, string> = {
  all: "All",
  personal: "Personal",
  commission: "Commissions",
  adoptable: "Adoptables",
};

export type PieceLabel = { name: string; href: string };

export function PieceWall({
  pieces,
  labels = {},
  filters = false,
  menu,
  empty,
  row = "md",
}: {
  pieces: Piece[];
  /** Characters each piece is on, shown on hover. */
  labels?: Record<string, PieceLabel[]>;
  /** Show the All / Personal / Commissions / Adoptables chips. */
  filters?: boolean;
  /** The owner's menu for a piece (rendered only for the owner). */
  menu?: (piece: Piece) => ReactNode;
  empty?: ReactNode;
  row?: "sm" | "md";
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: pieces.length, personal: 0, commission: 0, adoptable: 0 };
    for (const p of pieces) c[p.kind]++;
    return c;
  }, [pieces]);
  const visible = filter === "all" ? pieces : pieces.filter((p) => p.kind === filter);
  const media = useMemo(() => visible.map((p) => p.image), [visible]);
  const options = (Object.keys(FILTERS) as Filter[]).filter((key) => key === "all" || counts[key] > 0);

  function open(i: number) {
    setIndex(i);
    dialogRef.current?.showModal();
  }

  if (pieces.length === 0) return <>{empty}</>;

  return (
    <div>
      {filters && options.length > 2 && (
        <div
          role="group"
          aria-label="Show"
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {options.map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(key)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  active ? "bg-ink text-on-ink" : "border border-border bg-surface text-ink hover:bg-ice"
                }`}
              >
                {FILTERS[key]}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-on-ink/15 text-on-ink" : "bg-ice text-muted"}`}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ul
        className={`flex flex-wrap gap-2 after:grow-[999] after:content-[''] sm:gap-3 ${
          row === "sm" ? "[--row:7.5rem] sm:[--row:10rem]" : "[--row:9rem] sm:[--row:12.5rem] lg:[--row:13.5rem]"
        }`}
      >
        {visible.map((piece, i) => (
          <Tile key={piece.id} piece={piece} labels={labels[piece.id]} onOpen={() => open(i)} menu={menu?.(piece)} priority={i < 4} />
        ))}
      </ul>

      <Lightbox dialogRef={dialogRef} media={media} index={index} setIndex={setIndex} />
    </div>
  );
}

function Tile({
  piece,
  labels = [],
  onOpen,
  menu,
  priority,
}: {
  piece: Piece;
  labels?: PieceLabel[];
  onOpen: () => void;
  menu?: ReactNode;
  priority: boolean;
}) {
  const { saved, toggle } = useFavorite({ kind: "art", id: piece.id, title: piece.title });
  const ratio = piece.image.width / piece.image.height;
  const note =
    piece.kind === "commission"
      ? piece.client
        ? `Commission for @${piece.client}`
        : "Commission"
      : piece.kind === "adoptable" && piece.adopt
        ? piece.adopt.status === "sold"
          ? "Adopted ♥"
          : `Adoptable · ${formatUsd(piece.adopt.priceUsd)}`
        : null;

  return (
    <li
      data-part="piece"
      className="group relative"
      style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio.toFixed(4)})` } as CSSProperties}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${piece.title}`}
        className="relative block w-full overflow-hidden rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:rounded-[14px]"
        style={{ aspectRatio: ratio, backgroundColor: piece.image.palette?.[0] }}
      >
        <Image
          src={piece.image.src}
          alt={piece.image.alt}
          fill
          preload={priority}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 34vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </button>
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 rounded-b-[12px] bg-gradient-to-t from-scrim/75 via-scrim/25 to-transparent p-2.5 pt-10 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:pt-6 pointer-coarse:opacity-100 sm:rounded-b-[14px]"
      >
        <span className="min-w-0 flex-1 text-white">
          <span className="block truncate text-[0.8125rem] leading-tight font-semibold">{piece.title}</span>
          {(note || labels.length > 0) && (
            <span className="block truncate text-[0.6875rem] leading-tight text-white/80">
              {[...labels.map((l) => l.name), note].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      </span>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Unfavorite ${piece.title}` : `Favorite ${piece.title}`}
        onClick={toggle}
        className={`absolute top-2 right-2 inline-flex h-8 items-center gap-1 rounded-full bg-paper/90 px-2.5 text-xs font-semibold shadow-soft backdrop-blur-sm transition-[opacity,scale] focus-visible:opacity-100 active:scale-95 group-hover:opacity-100 pointer-coarse:opacity-100 ${
          saved ? "text-like opacity-100" : "text-on-paper opacity-0"
        }`}
      >
        <Heart aria-hidden className={`size-3.5 ${saved ? "animate-pop fill-current" : ""}`} />
        {piece.likes + (saved ? 1 : 0) > 0 && formatCompact(piece.likes + (saved ? 1 : 0))}
      </button>
      {menu && <span className="absolute top-2 left-2">{menu}</span>}
    </li>
  );
}
