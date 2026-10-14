"use client";

import Image from "next/image";
import { Heart, Layers } from "lucide-react";
import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useFavorite } from "@/components/favorites/store";
import { ListingArt } from "@/components/listings/listing-art";
import { formatUsd } from "@/lib/format";
import { isGif } from "@/lib/images/variants";
import type { WallItem } from "@/lib/wall/query";
import { useGifTurn } from "./gif-play";
import { noteOf } from "./labels";
import { cellRatio, matOf } from "./mat";

/*
 * One tile of the salon wall. The tile takes the art's shape (kept between
 * a tall 1:2 and a wide 12:5); the art sits whole on a mat tinted with its own
 * main color, never cropped and never enlarged past its pixels, so a 64px
 * pixel icon hangs small in the middle of its mat. Clicking opens the viewer
 * (the link still works in a new tab). Markers stay small: the art is the
 * point.
 */

const opensElsewhere = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

export function Tile({ item, onOpen, priority }: { item: WallItem; onOpen: () => void; priority: boolean }) {
  const cover = item.images[0];
  const ratio = cellRatio(cover);
  const gif = isGif(cover.src);
  const ref = useRef<HTMLLIElement>(null);
  const turn = useGifTurn(ref, gif && Boolean(cover.still));
  const [near, setNear] = useState(false);
  const playing = gif && (!cover.still || turn || near);
  const note = noteOf(item);
  // The widest this tile gets at the large size, so the browser picks a sharp enough copy.
  const sizes = `(min-width: 1280px) ${Math.ceil(ratio * 300)}px, (min-width: 640px) ${Math.ceil(ratio * 250)}px, ${Math.ceil(ratio * 180)}px`;

  return (
    <li
      ref={ref}
      data-part="wall-tile"
      data-wall-id={item.id}
      className="group/tile @container relative"
      style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio.toFixed(4)})` } as CSSProperties}
      onPointerEnter={gif ? () => setNear(true) : undefined}
      onPointerLeave={gif ? () => setNear(false) : undefined}
      onFocus={gif ? () => setNear(true) : undefined}
      onBlur={gif ? () => setNear(false) : undefined}
    >
      <a
        href={item.href}
        onClick={(event) => {
          if (opensElsewhere(event)) return;
          event.preventDefault();
          onOpen();
        }}
        className="relative block overflow-hidden rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:rounded-[10px]"
        style={{ aspectRatio: ratio, backgroundColor: matOf(cover.palette) }}
      >
        <span className="absolute inset-0 transition-transform duration-500 ease-out group-hover/tile:scale-[1.03]">
          {/* A GIF waits as its still frame and plays on top of it, so the swap never blinks. */}
          {gif && cover.still && <ListingArt image={{ ...cover, src: cover.still }} alt={cover.alt} sizes={sizes} priority={priority} />}
          {(!gif || playing) && <ListingArt image={cover} alt={gif && cover.still ? "" : cover.alt} sizes={sizes} priority={priority && !gif} />}
        </span>
        <span className="sr-only">
          {item.title} by {item.artist.name}
          {note && `. ${note}`}
          {item.images.length > 1 && `. ${item.images.length} pictures`}
        </span>
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-1.5 bg-gradient-to-t from-scrim/80 via-scrim/30 to-transparent p-2 pt-8 opacity-0 transition-opacity duration-200 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 pointer-coarse:hidden ${
            item.save ? "pr-10" : ""
          }`}
        >
          <Image
            src={item.artist.avatar.src}
            alt=""
            width={20}
            height={20}
            sizes="20px"
            className="hidden size-5 shrink-0 rounded-full object-cover ring-1 ring-white/60 @[8rem]:block"
            style={{ objectPosition: item.artist.avatar.focus }}
          />
          <span className="min-w-0 text-white">
            <span className="block truncate text-xs leading-tight font-semibold">{item.title}</span>
            <span className="block truncate text-[0.6875rem] leading-tight text-white/75">{item.artist.name}</span>
          </span>
        </span>
      </a>

      <span aria-hidden className="pointer-events-none absolute top-1.5 left-1.5 hidden max-w-[calc(100%-3.5rem)] @[6.5rem]:block">
        <Marker item={item} />
      </span>
      {(gif || item.images.length > 1) && (
        <span aria-hidden className="pointer-events-none absolute top-1.5 right-1.5 flex gap-1">
          {gif && <Badge>GIF</Badge>}
          {item.images.length > 1 && (
            <Badge>
              <Layers className="size-3" strokeWidth={2.5} />
              {item.images.length}
            </Badge>
          )}
        </span>
      )}
      {item.save && <TileHeart item={item as WallItem & { save: NonNullable<WallItem["save"]> }} />}
    </li>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[1.125rem] items-center gap-0.5 rounded-[5px] bg-scrim/60 px-1 text-[0.625rem] leading-none font-extrabold tracking-wide text-white backdrop-blur-sm">
      {children}
    </span>
  );
}

/** What the tile is, in the paper language of the rest of Explore: hang tag, ticket, folder tab, pencil note. */
function Marker({ item }: { item: WallItem }) {
  const paper = "flex h-[1.125rem] items-center truncate bg-paper text-[0.625rem] leading-none font-bold text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.25)]";
  switch (item.kind) {
    case "adoptable":
      return (
        <span className={`${paper} -rotate-3 gap-1 rounded-[3px] pr-1.5 pl-1`}>
          <span className="size-1 shrink-0 rounded-full bg-on-paper/35" />
          {item.status === "adopted" ? "Adopted ♥" : item.status === "reserved" ? "Reserved" : item.priceUsd !== undefined ? formatUsd(item.priceUsd) : "Adopt"}
        </span>
      );
    case "commission":
      return (
        <span className={`${paper} rounded-[3px] border-l-2 border-dashed border-on-paper/30 px-1.5`}>
          {item.priceUsd !== undefined ? `from ${formatUsd(item.priceUsd)}` : "Commission"}
        </span>
      );
    case "character":
      return (
        <span className={`${paper} gap-1 rounded-t-[6px] rounded-b-[2px] px-1.5`}>
          {item.images[0].palette?.slice(0, 3).map((hex) => (
            <span key={hex} className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
          ))}
          <span className="truncate">{item.title}</span>
        </span>
      );
    case "post":
      return item.stage ? (
        <span className={`${paper} rotate-2 rounded-[2px] px-1.5 font-hand text-[0.8125rem] font-semibold`}>
          {item.stage === "wip" ? "WIP" : "sketch"}
        </span>
      ) : null;
    case "piece":
      return null;
  }
}

function TileHeart({ item }: { item: WallItem & { save: NonNullable<WallItem["save"]> } }) {
  const { saved, toggle } = useFavorite({ kind: item.save.kind, id: item.save.id, title: item.title });
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
      onClick={toggle}
      className={`absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full bg-paper/90 shadow-soft backdrop-blur-sm transition-[opacity,scale] focus-visible:opacity-100 active:scale-90 group-hover/tile:opacity-100 pointer-coarse:hidden ${
        saved ? "text-like opacity-100" : "text-on-paper opacity-0"
      }`}
    >
      <Heart aria-hidden className={`size-3.5 ${saved ? "animate-pop fill-current" : ""}`} />
    </button>
  );
}
