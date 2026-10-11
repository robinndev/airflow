"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Dices, Heart } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { useFavorite } from "@/components/favorites/store";
import type { WallPiece } from "@/lib/explore";
import { formatCompact, formatUsd } from "@/lib/format";
import type { Mood, MoodSlug } from "@/lib/palette";

type Show = "all" | "commissions" | "adopts";
type Sort = "for-you" | "trending" | "newest" | "shuffle";

const PAGE = 24;

const SHOWS: { key: Show; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "commissions", label: "Open for commissions" },
  { key: "adopts", label: "Adoptables" },
];

const SORTS: { key: Exclude<Sort, "shuffle">; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "trending", label: "Trending" },
  { key: "newest", label: "Newest" },
];

// Deterministic shuffle so server and client agree on first paint.
function shuffle<T>(items: T[], seed: number) {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Wide panoramas and very tall pieces are clamped (and gently cropped). */
const ratioOf = ({ width, height }: WallPiece["image"]) => Math.min(2.1, Math.max(0.56, width / height));

/**
 * The wall: every piece in justified rows, so artwork keeps its own shape
 * instead of being cropped to a uniform card. Filtering by palette, kind and
 * order happens on the client over the prerendered list — no network.
 */
export function SalonWall({
  pieces,
  moods,
  counts,
}: {
  pieces: WallPiece[];
  moods: Mood[];
  counts: Record<MoodSlug, number>;
}) {
  const [mood, setMood] = useState<MoodSlug | null>(null);
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("for-you");
  const [seed, setSeed] = useState(7);
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(() => {
    let list = pieces;
    if (mood) list = list.filter((p) => p.moods.includes(mood));
    if (show === "commissions") list = list.filter((p) => p.commissionFromUsd !== undefined && !p.adopt);
    if (show === "adopts") list = list.filter((p) => p.adopt);
    if (sort === "trending") return list.toSorted((a, b) => b.likes - a.likes);
    if (sort === "newest") return list.toSorted((a, b) => b.postedAt.localeCompare(a.postedAt));
    if (sort === "shuffle") return shuffle(list, seed);
    return list;
  }, [mood, pieces, seed, show, sort]);

  const activeMood = moods.find((m) => m.slug === mood);
  const rainbow = moods.map((m) => m.swatches[2]);

  function reset() {
    setMood(null);
    setShow("all");
    setLimit(PAGE);
  }

  return (
    <div
      className="rounded-[28px] transition-[background-color] duration-700 sm:-mx-4 sm:p-4"
      style={{
        backgroundColor: activeMood
          ? `color-mix(in oklab, ${activeMood.swatches[1]} 14%, transparent)`
          : "transparent",
      }}
    >
      <div role="group" aria-label="Filter by palette" className="-mx-4 overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="flex w-max gap-3">
          <PaintChip
            name="All colors"
            code="AF-000"
            swatches={rainbow}
            count={pieces.length}
            active={mood === null}
            onClick={() => {
              setMood(null);
              setLimit(PAGE);
            }}
          />
          {moods.map((m) => (
            <PaintChip
              key={m.slug}
              name={m.name}
              code={m.code}
              swatches={m.swatches}
              count={counts[m.slug] ?? 0}
              active={mood === m.slug}
              onClick={() => {
                setMood(mood === m.slug ? null : m.slug);
                setLimit(PAGE);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {SHOWS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={show === s.key}
              onClick={() => {
                setShow(s.key);
                setLimit(PAGE);
              }}
              className="h-9 shrink-0 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Order" className="flex items-center gap-1 text-sm">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
              className="h-9 rounded-full px-3 font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-soft"
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={sort === "shuffle"}
            onClick={() => {
              setSort("shuffle");
              setSeed((s) => s + 17);
            }}
            className="group/dice inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-soft"
          >
            <Dices aria-hidden className="size-4 transition-transform duration-300 group-active/dice:rotate-90" />
            Shuffle
          </button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} pieces
      </p>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-ink">Nothing in this palette yet</p>
          <p className="mt-1 text-sm text-muted">Try another mix of colors and kinds.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 h-10 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-6 flex flex-wrap gap-2 [--row:8.5rem] after:grow-[999] after:content-[''] sm:gap-3 sm:[--row:12rem] lg:[--row:14rem]">
          {visible.slice(0, limit).map((piece, i) => (
            <WallTile key={piece.id} piece={piece} delay={Math.min(i % PAGE, 12) * 35} />
          ))}
        </ul>
      )}

      {visible.length > limit && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="h-11 rounded-full border border-border bg-surface px-6 text-[0.9375rem] font-semibold text-ink shadow-soft transition-colors hover:border-ocean/40"
          >
            Show more art
          </button>
          <p className="text-xs text-muted">
            {limit} of {visible.length} pieces
          </p>
        </div>
      )}
    </div>
  );
}

function PaintChip({
  name,
  code,
  swatches,
  count,
  active,
  onClick,
}: {
  name: string;
  code: string;
  swatches: string[];
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${name} palette, ${count} pieces`}
      onClick={onClick}
      className={`w-[8.5rem] shrink-0 rounded-[14px] bg-paper p-1.5 pb-2.5 text-left transition-[translate,box-shadow] duration-200 hover:-translate-y-1 sm:w-[9.25rem] ${
        active ? "-translate-y-1.5 shadow-lift ring-2 ring-ocean" : "shadow-soft ring-1 ring-border"
      }`}
    >
      <span aria-hidden className="flex h-14 overflow-hidden rounded-[9px] sm:h-16">
        {swatches.map((color) => (
          <span key={color} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </span>
      <span className="mt-2 flex items-center justify-between px-1 text-[0.625rem] font-bold tracking-[0.14em] text-paper-muted uppercase">
        {code}
        {active && <Check aria-hidden className="size-3.5 text-ocean" strokeWidth={3} />}
      </span>
      <span className="block truncate px-1 font-display text-sm font-bold text-on-paper">{name}</span>
      <span className="block px-1 text-xs text-paper-muted">{count} pieces</span>
    </button>
  );
}

function WallTile({ piece, delay }: { piece: WallPiece; delay: number }) {
  const { saved: liked, toggle } = useFavorite({ kind: "art", id: piece.id, title: piece.title });
  const ratio = ratioOf(piece.image);
  const tag = piece.adopt
    ? piece.adopt.status === "adopted"
      ? "Adopted ♥"
      : piece.adopt.priceUsd
        ? `Adopt · ${formatUsd(piece.adopt.priceUsd)}`
        : "Adopt · OTA"
    : piece.commissionFromUsd !== undefined
      ? `Commissions from ${formatUsd(piece.commissionFromUsd)}`
      : null;

  return (
    <li
      className="group relative animate-rise"
      style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio})`, animationDelay: `${delay}ms` } as CSSProperties}
    >
      <Link
        href={piece.href}
        className="@container relative block overflow-hidden rounded-[14px] sm:rounded-[16px]"
        style={{ aspectRatio: ratio, backgroundColor: piece.image.palette?.[0] }}
      >
        <Image
          src={piece.image.src}
          alt={piece.image.alt}
          fill
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 34vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ objectPosition: piece.image.focus ?? "50% 30%" }}
        />
        <span className="sr-only">
          {piece.title} by {piece.artist.name}
          {tag ? ` — ${tag}` : ""}
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-scrim/75 via-scrim/25 to-transparent p-2.5 pt-10 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:pt-6 pointer-coarse:opacity-100 sm:p-3"
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-white">
            <Image
              src={piece.artist.avatar.src}
              alt=""
              width={22}
              height={22}
              className="size-[22px] shrink-0 rounded-full object-cover ring-1 ring-white/60"
              style={{ objectPosition: piece.artist.avatar.focus }}
            />
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] leading-tight font-semibold pointer-coarse:hidden">
                {piece.title}
              </span>
              <span className="block truncate text-[0.6875rem] leading-tight text-white/75">{piece.artist.name}</span>
            </span>
          </span>
          {tag && (
            <span className="hidden shrink-0 rounded-full bg-paper/95 px-2 py-0.5 text-[0.6875rem] font-bold text-on-paper @2xs:block">
              {tag}
            </span>
          )}
        </span>
      </Link>
      <button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? `Unfavorite ${piece.title}` : `Favorite ${piece.title}`}
        onClick={toggle}
        className={`absolute top-2 right-2 inline-flex h-8 items-center gap-1 rounded-full bg-paper/90 px-2.5 text-xs font-semibold shadow-soft backdrop-blur-sm transition-[opacity,scale] focus-visible:opacity-100 active:scale-95 group-hover:opacity-100 pointer-coarse:hidden ${
          liked ? "text-like opacity-100" : "text-on-paper opacity-0"
        }`}
      >
        <Heart aria-hidden className={`size-3.5 ${liked ? "fill-current animate-pop" : ""}`} />
        {formatCompact(piece.likes + (liked ? 1 : 0))}
      </button>
    </li>
  );
}
