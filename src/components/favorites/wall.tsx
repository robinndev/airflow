import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HandNote, Tape } from "@/components/explore/doodles";
import { STAGES } from "@/components/feed/stages";
import type { FavoriteArt, FavoritePost } from "@/lib/favorites/queries";
import { glowOf } from "@/lib/palette";
import type { ImageAsset } from "@/lib/profile/types";
import { Pinned, WallView, type PinEntry } from "./pinned";

/*
 * The wall: saved art and posts pinned up in justified rows, so every piece
 * keeps its own shape. Art hangs as a print with a strip of tape dyed in its
 * own colors, posts as polaroids, text posts as sticky notes. The rows hold
 * because every tile is its art's width at the row height, plus the paper.
 */

type WallItem = FavoriteArt | FavoritePost;

/** A stable little tilt per piece, so the wall hangs the same way on every visit. */
export function tiltOf(id: string, max = 1.6) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (((h >>> 0) / 4294967296) * 2 - 1) * max;
}

/** Wide panoramas and very tall pieces are clamped (and gently cropped). */
const ratioOf = ({ width, height }: Pick<ImageAsset, "width" | "height">) =>
  Math.min(2.1, Math.max(0.56, width / height));

/** Sticky notes are a little taller than wide. */
const NOTE_RATIO = 0.86;

export function wallEntry(item: WallItem): PinEntry {
  return { key: item.key, group: item.kind === "art" ? "art" : "post", moods: item.moods };
}

export function Wall({ items }: { items: WallItem[] }) {
  return (
    <WallView entries={items.map(wallEntry)}>
      <ul className="mt-10 flex flex-wrap gap-x-4 gap-y-9 [--cap:2.5rem] [--pad:0.375rem] [--row:7.75rem] after:grow-[999] after:content-[''] sm:gap-x-6 sm:gap-y-12 sm:[--cap:2.875rem] sm:[--pad:0.5rem] sm:[--row:10.5rem] lg:[--row:12.5rem]">
        {items.map((item, i) => (
          <WallTile key={item.key} item={item} index={i} />
        ))}
      </ul>
    </WallView>
  );
}

function WallTile({ item, index }: { item: WallItem; index: number }) {
  const image = item.kind === "art" ? item.image : item.media[0];
  const ratio = image ? ratioOf(image) : NOTE_RATIO;
  const tilt = tiltOf(item.id);
  const style = {
    flexGrow: ratio,
    flexBasis: `calc(var(--row) * ${ratio} + 2 * var(--pad))`,
    animationDelay: `${Math.min(index, 14) * 40}ms`,
  } as CSSProperties;

  return (
    <Pinned
      entry={wallEntry(item)}
      target={{ kind: item.kind, id: item.id, title: item.title, savedAt: item.savedAt }}
      // min-w-0: a long caption must not widen the print and break the row.
      className="isolate min-w-0 animate-rise"
      style={style}
    >
      {item.kind === "art" ? (
        <Print item={item} ratio={ratio} tilt={tilt} />
      ) : image ? (
        <Polaroid item={item} image={image} ratio={ratio} tilt={tilt} />
      ) : (
        <StickyNote item={item} tilt={tilt} />
      )}
    </Pinned>
  );
}

const paper =
  "relative block rotate-(--tilt) p-[var(--pad)] shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_14px_28px_-14px_rgb(var(--shadow-rgb)/0.45)] transition-[rotate,translate,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_2px_4px_rgb(var(--shadow-rgb)/0.12),0_26px_44px_-18px_rgb(var(--shadow-rgb)/0.5)] focus-visible:rotate-0";

function Art({ image, ratio, sizes }: { image: ImageAsset; ratio: number; sizes: string }) {
  return (
    <span className="relative block overflow-hidden" style={{ aspectRatio: ratio, backgroundColor: image.palette?.[0] }}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: image.focus ?? "50% 30%" }}
      />
    </span>
  );
}

const SIZES = "(min-width: 1024px) 380px, (min-width: 640px) 40vw, 55vw";

/** A print, held up by tape dyed in the art's own colors. */
function Print({ item, ratio, tilt }: { item: FavoriteArt; ratio: number; tilt: number }) {
  const [tape] = glowOf(item.palette, 1);
  return (
    <Link href={item.href} className={`${paper} bg-paper`} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <Tape color={tape} tone="sky" className="-top-3.5 left-1/2 h-6 w-16 -translate-x-1/2 sm:w-20" />
      <Art image={item.image} ratio={ratio} sizes={SIZES} />
      <span className="flex h-[var(--cap)] min-w-0 flex-col justify-center px-0.5 leading-tight">
        <span className="truncate font-display text-[0.75rem] font-bold text-on-paper sm:text-[0.8125rem]">{item.title}</span>
        <span className="truncate text-[0.6875rem] text-paper-muted">
          by {item.artist.name}
          {item.commissionFromUsd !== undefined && (
            <span className="max-sm:hidden"> · takes commissions</span>
          )}
        </span>
      </span>
    </Link>
  );
}

/** A post with art: a polaroid, captioned by hand. More images peek out behind it. */
function Polaroid({ item, image, ratio, tilt }: { item: FavoritePost; image: ImageAsset; ratio: number; tilt: number }) {
  const extra = Math.min(item.media.length - 1, 2);
  const stage = STAGES[item.post.kind];
  return (
    <>
      {Array.from({ length: extra }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute inset-0 -z-10 bg-paper shadow-soft"
          style={{ rotate: `${tilt + (i ? -5 : 4.5)}deg`, translate: `${i ? -6 : 7}px ${i ? 4 : 2}px` }}
        />
      ))}
      <Link href={item.href} className={`${paper} bg-paper`} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
        <Art image={image} ratio={ratio} sizes={SIZES} />
        {item.media.length > 1 && (
          <span className="absolute top-[calc(var(--pad)+0.375rem)] right-[calc(var(--pad)+0.375rem)] rounded-full bg-paper/95 px-2 py-0.5 text-[0.6875rem] font-bold text-on-paper shadow-soft">
            +{item.media.length - 1}
          </span>
        )}
        <span className="flex h-[var(--cap)] min-w-0 flex-col justify-center px-0.5">
          <HandNote tone="paper" className="block truncate text-base leading-[1.05] sm:text-lg">
            {item.title}
          </HandNote>
          <span className="truncate text-[0.625rem] leading-tight font-semibold text-paper-muted sm:text-[0.6875rem]">
            @{item.author.handle} · {stage.label}
          </span>
        </span>
      </Link>
    </>
  );
}

/** A text post, kept as a sticky note signed by its author. */
function StickyNote({ item, tilt }: { item: FavoritePost; tilt: number }) {
  return (
    <Link
      href={item.href}
      className={`${paper} bg-[color-mix(in_oklab,var(--star)_24%,var(--paper))]`}
      style={{ "--tilt": `${tilt * 1.6}deg` } as CSSProperties}
    >
      <span className="block overflow-hidden p-1 sm:p-1.5" style={{ aspectRatio: NOTE_RATIO }}>
        <span className="line-clamp-4 text-[0.75rem] leading-snug font-medium text-pretty text-on-paper sm:line-clamp-6 sm:text-[0.875rem] lg:line-clamp-7">
          {item.post.body}
        </span>
      </span>
      <span className="flex h-[var(--cap)] items-center justify-end px-1">
        <HandNote tone="paper" className="truncate text-lg sm:text-xl">
          — {item.author.displayName.split(" ")[0]}
        </HandNote>
      </span>
    </Link>
  );
}
