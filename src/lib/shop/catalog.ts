import { FRAMES, type Frame } from "../frames.ts";

/*
 * The supply shop's catalog (client-safe): everything an artist can put on
 * their page beyond the customizer. Frames go around the picture, effects
 * play over the top of the profile, animated names and covers move, sticker
 * packs add stickers to the About board, and a pin sits beside the name.
 *
 * Ownership lives in `public.owned_items` (kind + item id). Free items are
 * anyone's; paid ones wait on checkout, except Flow+'s monthly pick. Prices
 * are placeholders until shop pricing is decided (docs/roadmap.md).
 */

export type ItemKind = "frame" | "effect" | "name" | "cover" | "stickers" | "pin";
export type Rarity = Frame["rarity"];

export type ShopItem = {
  kind: ItemKind;
  id: string;
  name: string;
  blurb: string;
  /** 0 = free to claim. */
  priceUsd: number;
  rarity: Rarity;
  animated: boolean;
};

/** Each kind's aisle in the store, and where it goes on the page. */
export const KINDS: Record<ItemKind, { aisle: string; shelf: string; where: string; worn: boolean }> = {
  frame: { aisle: "Frames", shelf: "Hung on the pegboard", where: "Around your picture", worn: true },
  effect: { aisle: "Profile effects", shelf: "Bottled, shake gently", where: "Over the top of your profile", worn: true },
  name: { aisle: "Animated names", shelf: "Inks that move", where: "Your display name", worn: true },
  cover: { aisle: "Animated covers", shelf: "Primed and ready", where: "Over your cover image", worn: true },
  stickers: { aisle: "Sticker packs", shelf: "Die-cut, with a white edge", where: "Your About board", worn: false },
  pin: { aisle: "Pins", shelf: "On the felt", where: "Beside your name", worn: true },
};

export const KIND_ORDER: ItemKind[] = ["frame", "effect", "name", "cover", "stickers", "pin"];

const fromFrame = (frame: Frame): ShopItem => ({ kind: "frame", ...frame });

const EFFECTS: ShopItem[] = [
  { kind: "effect", id: "petals", name: "Petal Drift", blurb: "Blossoms falling past your banner.", priceUsd: 0, rarity: "common", animated: true },
  { kind: "effect", id: "bubbles", name: "Soda Bubbles", blurb: "Fizz rising from the bottom of the page.", priceUsd: 1.99, rarity: "rare", animated: true },
  { kind: "effect", id: "snow", name: "First Snow", blurb: "Quiet flakes, never a blizzard.", priceUsd: 1.99, rarity: "rare", animated: true },
  { kind: "effect", id: "fireflies", name: "Fireflies", blurb: "Little lights wandering after dark.", priceUsd: 2.99, rarity: "epic", animated: true },
  { kind: "effect", id: "starfall", name: "Starfall", blurb: "Shooting stars, make a wish.", priceUsd: 3.99, rarity: "legendary", animated: true },
];

const NAMES: ShopItem[] = [
  { kind: "name", id: "wave", name: "Wave", blurb: "Your letters bob like a happy tail.", priceUsd: 0, rarity: "common", animated: true },
  { kind: "name", id: "rainbow", name: "Rainbow Ink", blurb: "Every color, slowly flowing through.", priceUsd: 1.99, rarity: "rare", animated: true },
  { kind: "name", id: "neon", name: "Neon Sign", blurb: "Buzzes on, flickers now and then.", priceUsd: 2.99, rarity: "epic", animated: true },
  { kind: "name", id: "glitch", name: "Glitch", blurb: "A signal from another channel.", priceUsd: 2.99, rarity: "epic", animated: true },
  { kind: "name", id: "sparkle", name: "Fresh Sparkle", blurb: "Twinkles that come and go.", priceUsd: 3.99, rarity: "legendary", animated: true },
];

const COVERS: ShopItem[] = [
  { kind: "cover", id: "sunbeams", name: "Sunbeams", blurb: "Soft light turning across your cover.", priceUsd: 0, rarity: "common", animated: true },
  { kind: "cover", id: "rain", name: "Window Rain", blurb: "Rain on the glass. Cozy indoors.", priceUsd: 1.99, rarity: "rare", animated: true },
  { kind: "cover", id: "twinkle", name: "Night Sky", blurb: "Stars that wink over your art.", priceUsd: 2.99, rarity: "epic", animated: true },
  { kind: "cover", id: "holo", name: "Holo Sheen", blurb: "A rainbow glint, like a rare foil card.", priceUsd: 3.99, rarity: "legendary", animated: true },
];

/** Sticker packs: each adds these stickers to the About board. */
export const STICKER_PACKS = {
  cafe: ["coffee", "croissant", "teacup", "cake"],
  space: ["planet", "rocket", "comet", "ufo"],
  pixel: ["pixel-heart", "pixel-star", "pixel-sword", "pixel-potion"],
} as const;

export type PackId = keyof typeof STICKER_PACKS;
export type PackSticker = (typeof STICKER_PACKS)[PackId][number];

const PACKS: ShopItem[] = [
  { kind: "stickers", id: "cafe", name: "Café Break", blurb: "Coffee, a croissant, tea and cake.", priceUsd: 0, rarity: "common", animated: false },
  { kind: "stickers", id: "space", name: "Space Cadet", blurb: "A planet, a rocket, a comet and a visitor.", priceUsd: 0.99, rarity: "rare", animated: false },
  { kind: "stickers", id: "pixel", name: "Pixel Pack", blurb: "A heart, a star, a sword and a potion, 8-bit.", priceUsd: 0.99, rarity: "rare", animated: false },
];

const PINS: ShopItem[] = [
  { kind: "pin", id: "brush", name: "Paintbrush", blurb: "The classic. Always loaded.", priceUsd: 0, rarity: "common", animated: false },
  { kind: "pin", id: "owl", name: "Night Owl", blurb: "Best work happens at 3 am.", priceUsd: 0, rarity: "common", animated: false },
  { kind: "pin", id: "coffee", name: "Fueled by Coffee", blurb: "Cup number four, at least.", priceUsd: 0.99, rarity: "rare", animated: false },
  { kind: "pin", id: "oc", name: "OC Lover", blurb: "Ask me about my characters.", priceUsd: 0.99, rarity: "rare", animated: false },
  { kind: "pin", id: "holo-star", name: "Holo Star", blurb: "Shines a little when it catches the light.", priceUsd: 1.99, rarity: "epic", animated: true },
];

export const SHOP_ITEMS: ShopItem[] = [...FRAMES.map(fromFrame), ...EFFECTS, ...NAMES, ...COVERS, ...PACKS, ...PINS];

export const isItemKind = (value: unknown): value is ItemKind => KIND_ORDER.includes(value as ItemKind);

export const itemOf = (kind: ItemKind, id: string | null | undefined) =>
  id ? SHOP_ITEMS.find((item) => item.kind === kind && item.id === id) : undefined;

export const itemsOf = (kind: ItemKind) => SHOP_ITEMS.filter((item) => item.kind === kind);

export const itemKey = (item: { kind: ItemKind; id: string }) => `${item.kind}:${item.id}`;

export const formatItemPrice = (item: ShopItem) => (item.priceUsd === 0 ? "Free" : `$${item.priceUsd.toFixed(2)}`);

/** Which sticker pack a board sticker comes from (built-in stickers come from none). */
export function packOfSticker(sticker: string): PackId | undefined {
  return (Object.keys(STICKER_PACKS) as PackId[]).find((pack) => (STICKER_PACKS[pack] as readonly string[]).includes(sticker));
}

/** What an account owns, as `kind:id` keys (free items always count). */
export type Owned = ReadonlySet<string>;

export const ownsItem = (owned: Owned, item: ShopItem) => item.priceUsd === 0 || owned.has(itemKey(item));

/** The stickers an account's packs add to the board (free packs included). */
export const packStickersOwned = (owned: Owned): PackSticker[] =>
  PACKS.filter((pack) => ownsItem(owned, pack)).flatMap((pack) => STICKER_PACKS[pack.id as PackId]);

/** Flow+'s monthly pick: the first day of the month a date falls in (UTC), as stored. */
export const pickMonth = (date: Date) => `${date.toISOString().slice(0, 7)}-01`;

/** What a profile wears from the shop (stored in `profiles.customization`). */
export type Worn = { frame?: string; effect?: string; nameFx?: string; coverFx?: string; pin?: string };

export const WORN_FIELD: Record<Exclude<ItemKind, "stickers">, keyof Worn> = {
  frame: "frame",
  effect: "effect",
  name: "nameFx",
  cover: "coverFx",
  pin: "pin",
};

/**
 * Worn items and board stickers the account doesn't own (or that left the
 * catalog). The customizer's save and the shop refuse them.
 */
export function unownedInUse(worn: Worn, stickers: readonly string[], owned: Owned): string[] {
  const problems: string[] = [];
  for (const kind of Object.keys(WORN_FIELD) as (keyof typeof WORN_FIELD)[]) {
    const id = worn[WORN_FIELD[kind]];
    if (!id) continue;
    const item = itemOf(kind, id);
    if (!item) problems.push(`that ${KINDS[kind].aisle.toLowerCase().replace(/s$/, "")} isn't in the shop anymore`);
    else if (!ownsItem(owned, item)) problems.push(item.name);
  }
  for (const pack of new Set(stickers.map(packOfSticker).filter((p): p is PackId => Boolean(p)))) {
    const item = itemOf("stickers", pack)!;
    if (!ownsItem(owned, item)) problems.push(`the ${item.name} stickers`);
  }
  return problems;
}
