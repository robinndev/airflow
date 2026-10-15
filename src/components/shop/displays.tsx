import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Sticker } from "@/components/about/stickers";
import { FrameArt } from "@/components/frames/avatar-frame";
import type { FrameId } from "@/lib/frames";
import type { ImageAsset } from "@/lib/profile/types";
import { STICKER_PACKS, type PackId, type ShopItem } from "@/lib/shop/catalog";
import { CoverEffect } from "./fx/cover-effect";
import { NameFx } from "./fx/name-fx";
import { Pin } from "./fx/pin";
import { ProfileEffect } from "./fx/profile-effect";

/*
 * How each aisle shows its stock, like a real art-supply shop: frames hang
 * in blister cards on a pegboard, effects are bottled in jars, animated names
 * are inks, covers are little primed canvases, sticker packs are sheets, and
 * pins sit on felt. Every product is a button that tries the item on in the
 * mirror; its paper price tag says where it stands for you.
 */

export type TagTone = "worn" | "owned" | "free" | "price" | "pick";
export type Tag = { label: string; tone: TagTone };

export type DisplayProps = {
  items: ShopItem[];
  selected: string | null;
  tagOf: (item: ShopItem) => Tag;
  onPick: (item: ShopItem) => void;
  avatar: ImageAsset | null;
  banner: ImageAsset | null;
  firstName: string;
};

const TAG_TONES: Record<TagTone, string> = {
  worn: "bg-mint text-on-mint",
  owned: "bg-paper text-paper-muted",
  free: "bg-paper text-ocean dark:text-ocean",
  price: "bg-paper text-on-paper",
  pick: "bg-lilac text-white",
};

/** A paper tag on a string, tied under the product. */
export function PriceTag({ tag, className = "" }: { tag: Tag; className?: string }) {
  return (
    <span className={`pointer-events-none flex flex-col items-center ${className}`}>
      <svg aria-hidden viewBox="0 0 10 14" className="-mb-px h-3.5 w-2.5 text-muted/70">
        <path d="M5 0c-2 5 2 9 0 14" fill="none" stroke="currentColor" strokeWidth="1.1" />
      </svg>
      <span
        className={`rounded-[4px] px-2 py-0.5 font-display text-xs font-extrabold tracking-tight shadow-[0_2px_4px_rgb(var(--shadow-rgb)/0.18)] [clip-path:polygon(12%_0,88%_0,100%_30%,100%_100%,0_100%,0_30%)] ${TAG_TONES[tag.tone]}`}
      >
        {tag.label}
      </span>
    </span>
  );
}

/** The clickable product: picks it for the mirror, and shows it's picked. */
function Product({
  item,
  selected,
  tag,
  onPick,
  className = "",
  children,
}: {
  item: ShopItem;
  selected: boolean;
  tag: Tag;
  onPick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${tag.label}`}
      onClick={onPick}
      className={`group/product relative flex flex-col items-center rounded-card outline-offset-4 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-ocean aria-pressed:-translate-y-1 ${className}`}
    >
      {children}
      <PriceTag tag={tag} />
      <span className="mt-1 max-w-full truncate px-1 text-[0.8125rem] font-semibold text-ink group-aria-pressed/product:text-ocean-ink dark:group-aria-pressed/product:text-ocean">
        {item.name}
      </span>
      {selected && <span aria-hidden className="absolute -top-2 left-1/2 size-2 -translate-x-1/2 rounded-full bg-ocean shadow-[0_0_0_3px_var(--surface)]" />}
    </button>
  );
}

/** A wooden shelf plank the products stand on. */
export function Plank({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative px-2 sm:px-4 ${className}`}>
      <div className="relative z-10">{children}</div>
      <div aria-hidden className="relative -mt-1 h-3.5 rounded-[3px] bg-shelf shadow-[0_10px_16px_-8px_rgb(var(--shadow-rgb)/0.45)]">
        <span className="absolute inset-x-0 bottom-0 h-1.5 rounded-b-[3px] bg-shelf-edge" />
      </div>
    </div>
  );
}

function Face({ avatar, size }: { avatar: ImageAsset | null; size: number }) {
  return avatar ? (
    <Image src={avatar.src} alt="" width={size} height={size} className="size-full rounded-full bg-ice object-cover" />
  ) : (
    <span className="block size-full rounded-full bg-gradient-to-br from-sky/70 to-lilac/70" />
  );
}

/* ----------------------------------------------------------------- frames */

// A blister card's hanging slot, punched through the top.
const SLOT = "radial-gradient(ellipse 13px 5px at 50% 9px, transparent 98%, black)";

export function Pegboard({ items, selected, tagOf, onPick, avatar }: DisplayProps) {
  return (
    <div className="rounded-panel bg-pegboard bg-[radial-gradient(circle,rgb(var(--shadow-rgb)/0.2)_2px,transparent_2.6px)] bg-[size:24px_24px] p-4 shadow-[inset_0_2px_8px_rgb(var(--shadow-rgb)/0.12)] sm:p-6">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col items-center">
            {/* The peg it hangs from. */}
            <span aria-hidden className="h-2.5 w-1.5 rounded-full bg-shelf-edge" />
            <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="-mt-1 w-full">
              <span
                className="flex w-full max-w-[8.5rem] flex-col items-center rounded-[12px] bg-paper px-3 pt-6 pb-4 shadow-soft"
                style={{ maskImage: SLOT, WebkitMaskImage: SLOT }}
              >
                {/* Clear plastic bubble. */}
                <span className="relative grid size-[4.5rem] place-items-center rounded-full bg-white/40 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.9),inset_6px_6px_10px_rgb(255_255_255/0.6),0_2px_6px_rgb(0_0_0/0.08)]">
                  <span className="relative size-12">
                    <Face avatar={avatar} size={48} />
                    <FrameArt frame={item.id as FrameId} />
                  </span>
                </span>
              </span>
            </Product>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- effects */

const JAR_GLASS: Record<string, string> = {
  petals: "linear-gradient(180deg, #fff2f6, #ffdbe7)",
  bubbles: "linear-gradient(180deg, #e9f8ff, #c8ecff)",
  snow: "linear-gradient(180deg, #8fb3d9, #c9dcf0)",
  fireflies: "linear-gradient(180deg, #13203a, #26385a)",
  starfall: "linear-gradient(180deg, #0f1430, #2a2560)",
};

const LID: Record<ShopItem["rarity"], string> = {
  common: "bg-sky",
  rare: "bg-mint",
  epic: "bg-lilac",
  legendary: "bg-star",
};

export function Jars({ items, selected, tagOf, onPick }: DisplayProps) {
  return (
    <Plank>
      <ul className="grid grid-cols-2 items-end gap-x-3 gap-y-8 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col items-center">
            <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="w-full pb-3">
              <span aria-hidden className={`h-3 w-[4.25rem] rounded-t-[6px] ${LID[item.rarity]} shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]`} />
              <span aria-hidden className="h-1.5 w-[4.75rem] rounded-[2px] bg-white/70" />
              <span
                className="relative h-28 w-[5.75rem] overflow-hidden rounded-[16px_16px_24px_24px] shadow-[inset_0_0_0_2px_rgb(255_255_255/0.75),inset_8px_0_14px_-6px_rgb(255_255_255/0.7),0_6px_12px_-6px_rgb(var(--shadow-rgb)/0.4)]"
                style={{ background: JAR_GLASS[item.id] }}
              >
                <ProfileEffect id={item.id} count={7} />
                {/* Its label, wrapped around the glass. */}
                <span className="absolute inset-x-2 bottom-3 z-30 rounded-[3px] bg-paper px-1 py-0.5 text-center font-hand text-[0.95rem] leading-tight font-bold text-on-paper shadow-soft">
                  {item.name.split(" ")[0]}
                </span>
              </span>
            </Product>
          </li>
        ))}
      </ul>
    </Plank>
  );
}

/* ------------------------------------------------------------------ names */

const INK: Record<string, string> = {
  wave: "linear-gradient(180deg, #7cc6ff, #3b8eea)",
  rainbow: "linear-gradient(180deg, #ff7ab0, #ffc35c 30%, #5ee08f 55%, #3bc4ff 78%, #a77bff)",
  neon: "linear-gradient(180deg, #1b1340, #3a1d6e)",
  glitch: "linear-gradient(180deg, #1b2a33, #0f171c)",
  sparkle: "linear-gradient(180deg, #fff3c4, #ffd166)",
};

export function InkBottles({ items, selected, tagOf, onPick, firstName }: DisplayProps) {
  return (
    <Plank>
      <ul className="grid grid-cols-2 items-end gap-x-3 gap-y-8 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col items-center">
            <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="w-full pb-3">
              <span aria-hidden className="h-3.5 w-7 rounded-t-[4px] bg-ink/80" />
              <span aria-hidden className="h-2 w-9 rounded-[3px] bg-ink/60" />
              <span
                className="relative grid h-24 w-[6.5rem] place-items-center overflow-hidden rounded-[14px] shadow-[inset_0_0_0_2px_rgb(255_255_255/0.6),inset_10px_0_14px_-8px_rgb(255_255_255/0.6),0_6px_12px_-6px_rgb(var(--shadow-rgb)/0.4)]"
                style={{ background: INK[item.id] }}
              >
                {/* The label shows your own name in that ink. */}
                <span className="relative z-10 mx-2 max-w-[calc(100%-1rem)] rounded-[3px] bg-paper px-1.5 py-1 font-display text-[0.9375rem] leading-none font-extrabold text-on-paper shadow-soft">
                  <span className="block truncate">
                    <NameFx fx={item.id} text={firstName} />
                  </span>
                </span>
              </span>
            </Product>
          </li>
        ))}
      </ul>
    </Plank>
  );
}

/* ----------------------------------------------------------------- covers */

const PRIMED = "linear-gradient(135deg, var(--sky), var(--lilac) 55%, var(--mint))";

export function Canvases({ items, selected, tagOf, onPick, banner }: DisplayProps) {
  return (
    <Plank>
      <ul className="grid grid-cols-1 items-end gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id} className="flex flex-col items-center">
            <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="w-full pb-3">
              <span
                className="relative block aspect-[16/7] w-full max-w-[15rem] overflow-hidden rounded-[4px] shadow-[0_0_0_4px_var(--shelf-edge),0_8px_14px_-6px_rgb(var(--shadow-rgb)/0.5)]"
                style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg`, background: PRIMED }}
              >
                {banner && <Image src={banner.src} alt="" fill sizes="240px" className="object-cover" style={{ objectPosition: banner.focus ?? "50% 50%" }} />}
                <CoverEffect id={item.id} />
              </span>
            </Product>
          </li>
        ))}
      </ul>
    </Plank>
  );
}

/* --------------------------------------------------------------- stickers */

const STICKER_INKS = ["#ff6fa5", "#ffb347", "#4fc3f7", "#9b8cff"];

export function StickerSheets({ items, selected, tagOf, onPick }: DisplayProps) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3">
      {items.map((item, i) => (
        <li key={item.id} className="flex flex-col items-center">
          <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="w-full">
            <span
              className="relative grid w-full max-w-[13rem] grid-cols-2 gap-3 rounded-[10px] bg-paper p-4 pb-9 shadow-soft [clip-path:polygon(0_0,100%_0,100%_calc(100%-22px),calc(100%-22px)_100%,0_100%)]"
              style={{ rotate: `${(i - 1) * 2}deg` }}
            >
              {STICKER_PACKS[item.id as PackId].map((id, s) => (
                <span key={id} className="aspect-square p-1.5" style={{ rotate: `${(s % 2 ? 6 : -5) + s}deg` }}>
                  <Sticker id={id} color={STICKER_INKS[s % STICKER_INKS.length]} />
                </span>
              ))}
              <span className="absolute inset-x-4 bottom-2.5 truncate text-center font-hand text-base font-bold text-paper-muted">{item.name}</span>
              {/* Peeled corner. */}
              <span aria-hidden className="absolute right-0 bottom-0 size-[22px] bg-[linear-gradient(135deg,rgb(0_0_0/0.12)_45%,var(--paper)_50%)]" />
            </span>
          </Product>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------- pins */

export function PinBoard({ items, selected, tagOf, onPick }: DisplayProps) {
  return (
    <div className="rounded-panel bg-felt p-5 shadow-[inset_0_2px_10px_rgb(var(--shadow-rgb)/0.18)] sm:p-7" style={{ backgroundImage: FELT } as CSSProperties}>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col items-center">
            <Product item={item} selected={selected === item.id} tag={tagOf(item)} onPick={() => onPick(item)} className="w-full">
              <Pin id={item.id} size={56} className="mb-1" />
            </Product>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Felt: fine fibers, lighter and darker, over the theme's felt color.
const FELT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E")`;
