"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFavorite } from "@/components/favorites/store";
import { PaletteChips } from "@/components/feed/palette-chips";
import { ListingArt } from "@/components/listings/listing-art";
import { buttonClasses } from "@/components/ui/button";
import { formatCompact, formatShortDate, formatUsd } from "@/lib/format";
import { MOODS } from "@/lib/palette";
import type { WallItem } from "@/lib/wall/query";
import { actionOf, KIND_NAME } from "./labels";
import { matOf } from "./mat";

/*
 * Opening a tile: the art as big as the screen allows (never past its own
 * pixels, so pixel art stays crisp), its pictures if it's a set, and a
 * museum-style wall label: what it is, who made it, its colors, the price
 * when it's for sale, and the way to its own page. ← and → walk the wall in
 * order; nearing the end loads the next page. Closing puts focus back on the
 * tile you ended on.
 */

export function Viewer({
  items,
  index,
  onIndex,
  onNearEnd,
}: {
  items: WallItem[];
  index: number | null;
  onIndex: (index: number | null) => void;
  onNearEnd: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const item = index === null ? null : items[index];
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (item) lastId.current = item.id;
  }, [item]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  useEffect(() => {
    if (index !== null && index >= items.length - 4) onNearEnd();
  }, [index, items.length, onNearEnd]);

  const go = (step: number) => {
    if (index === null) return;
    const next = index + step;
    if (next >= 0 && next < items.length) onIndex(next);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="wall-viewer-title"
      onClose={() => {
        onIndex(null);
        const id = lastId.current;
        // Back on the wall where you ended up, not where you started.
        if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-wall-id="${CSS.escape(id)}"] a`)?.focus());
      }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain bg-scrim/[0.97] p-0 backdrop:bg-transparent open:block lg:overflow-hidden"
    >
      {item && (
        <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Stage key={item.id} item={item} onClose={() => dialogRef.current?.close()} />
          <WallLabel item={item} items={items} onIndex={onIndex} />

          <div className="pointer-events-none absolute inset-x-0 top-[calc(31dvh-1.25rem)] flex justify-between px-2 sm:px-4 lg:top-1/2 lg:right-[24rem] lg:-translate-y-1/2">
            <button
              type="button"
              aria-label="Previous piece"
              disabled={index === 0}
              onClick={() => go(-1)}
              className="pointer-events-auto grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-0 lg:size-12"
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Next piece"
              disabled={index === items.length - 1}
              onClick={() => go(1)}
              className="pointer-events-auto grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-0 lg:size-12"
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** The art itself, and the rest of its set as small prints to flip through. */
function Stage({ item, onClose }: { item: WallItem; onClose: () => void }) {
  const [picture, setPicture] = useState(0);
  const image = item.images[picture] ?? item.images[0];

  return (
    <div
      className="relative flex h-[62dvh] flex-col gap-3 px-3 pt-16 pb-3 sm:px-16 lg:h-dvh lg:px-20 lg:pt-14 lg:pb-8"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 left-3 grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:top-4 sm:left-4"
      >
        <X aria-hidden className="size-5" />
      </button>
      {item.images.length > 1 && (
        <p className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm sm:top-6">
          {picture + 1} / {item.images.length}
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <ListingArt key={image.src} image={image} sizes="(min-width: 1024px) calc(100vw - 30rem), 100vw" priority />
      </div>

      {item.images.length > 1 && (
        <ul aria-label="Pictures" className="flex shrink-0 justify-center gap-2 overflow-x-auto [scrollbar-width:none]">
          {item.images.map((other, i) => (
            <li key={other.src} className="shrink-0">
              <button
                type="button"
                aria-label={`Picture ${i + 1}`}
                aria-current={i === picture || undefined}
                onClick={() => setPicture(i)}
                className="relative block size-12 overflow-hidden rounded-[8px] opacity-60 ring-2 ring-transparent transition hover:opacity-100 aria-current:opacity-100 aria-current:ring-white sm:size-14"
                style={{ backgroundColor: matOf(other.palette) }}
              >
                <ListingArt image={{ ...other, src: other.still ?? other.src }} alt="" sizes="56px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const linkToCommissions = (artist: WallItem["artist"]) =>
  artist.href === `/${artist.handle}` ? `/${artist.handle}/commissions` : artist.href;

/** The museum label beside the art, printed on paper. */
function WallLabel({ item, items, onIndex }: { item: WallItem; items: WallItem[]; onIndex: (index: number) => void }) {
  const palette = item.images[0].palette ?? [];
  const moods = MOODS.filter((m) => item.moods.includes(m.slug));
  const more = items.filter((other) => other.artist.handle === item.artist.handle && other.id !== item.id).slice(0, 6);
  const term = "text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase";

  return (
    <aside className="flex flex-col gap-4 bg-canvas px-4 pt-5 pb-10 sm:px-6 lg:overflow-y-auto lg:pt-14">
      <div className="rounded-card bg-paper p-5 text-on-paper shadow-lift">
        <p className={term}>
          {KIND_NAME[item.kind]}
          {item.stage && ` · ${item.stage === "wip" ? "Work in progress" : "Sketch"}`} · {formatShortDate(item.createdAt)}
        </p>
        <h2 id="wall-viewer-title" className="mt-1.5 font-display text-2xl leading-tight font-extrabold tracking-tight">
          {item.title}
        </h2>
        {item.subtitle && <p className="mt-0.5 text-sm text-paper-muted">{item.subtitle}</p>}

        <Link href={item.artist.href} className="group/artist mt-4 flex items-center gap-2.5">
          <Image
            src={item.artist.avatar.src}
            alt=""
            width={36}
            height={36}
            sizes="36px"
            className="size-9 shrink-0 rounded-full object-cover"
            style={{ objectPosition: item.artist.avatar.focus }}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold group-hover/artist:underline">{item.artist.name}</span>
            <span className="block truncate text-xs text-paper-muted">@{item.artist.handle}</span>
          </span>
        </Link>

        <dl className="mt-4 grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-t border-dashed border-on-paper/15 pt-4 text-sm">
          {item.kind === "adoptable" && (
            <>
              <dt className={term}>Price</dt>
              <dd className="font-semibold">
                {item.status === "adopted"
                  ? "Adopted ♥"
                  : `${item.priceUsd !== undefined ? formatUsd(item.priceUsd) : "Make an offer"}${item.status === "reserved" ? " · reserved" : ""}`}
              </dd>
            </>
          )}
          {item.kind === "commission" && item.priceUsd !== undefined && (
            <>
              <dt className={term}>Price</dt>
              <dd className="font-semibold">from {formatUsd(item.priceUsd)}</dd>
            </>
          )}
          {item.openFromUsd !== undefined && item.kind !== "commission" && (
            <>
              <dt className={term}>Studio</dt>
              <dd>
                <Link href={linkToCommissions(item.artist)} className="font-semibold text-accent-strong hover:underline">
                  Taking commissions · from {formatUsd(item.openFromUsd)}
                </Link>
              </dd>
            </>
          )}
          {palette.length > 0 && (
            <>
              <dt className={term}>Palette</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <PaletteChips colors={palette} />
                {moods.map((mood) => (
                  <Link key={mood.slug} href={`/explore?color=${mood.slug}`} className="text-xs text-paper-muted hover:text-on-paper hover:underline">
                    {mood.name}
                  </Link>
                ))}
              </dd>
            </>
          )}
          {item.likes > 0 && (
            <>
              <dt className={term}>Loved</dt>
              <dd>{formatCompact(item.likes)} likes</dd>
            </>
          )}
        </dl>
      </div>

      <div className="flex gap-2">
        <Link href={item.href} className={buttonClasses({ size: "lg", className: "min-w-0 flex-1" })}>
          <span className="truncate">{actionOf(item)}</span>
        </Link>
        {item.save && <SaveButton key={item.id} item={item as WallItem & { save: NonNullable<WallItem["save"]> }} />}
      </div>

      {more.length > 0 && (
        <section aria-label={`More by ${item.artist.name}`} className="mt-2">
          <h3 className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">More by {item.artist.name}</h3>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {more.map((other) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onIndex(items.indexOf(other))}
                  aria-label={other.title}
                  className="relative block aspect-square w-full overflow-hidden rounded-[10px] transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                  style={{ backgroundColor: matOf(other.images[0].palette) }}
                >
                  <ListingArt image={{ ...other.images[0], src: other.images[0].still ?? other.images[0].src }} alt="" sizes="120px" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

function SaveButton({ item }: { item: WallItem & { save: NonNullable<WallItem["save"]> } }) {
  const { saved, toggle } = useFavorite({ kind: item.save.kind, id: item.save.id, title: item.title });
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
      onClick={toggle}
      className={buttonClasses({ variant: "secondary", size: "lg", className: saved ? "text-like" : "" })}
    >
      <Heart aria-hidden className={saved ? "animate-pop fill-current" : ""} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
