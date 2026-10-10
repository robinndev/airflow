/*
 * Avatar frames: decorations drawn around a profile picture, sold in the shop
 * (/shop) and equipped from the customizer. Ownership lives in
 * `public.owned_frames`; free frames are claimable by anyone.
 *
 * Prices are placeholders until the payments provider and shop pricing are
 * decided (docs/roadmap.md) — the shop says checkout opens soon.
 */

export type FrameId =
  | "sakura"
  | "doodle"
  | "pixel"
  | "kitty"
  | "neon"
  | "flame"
  | "holo"
  | "crown"
  | "stardust"
  | "paint";

export type Frame = {
  id: FrameId;
  name: string;
  blurb: string;
  /** 0 = free to claim. */
  priceUsd: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  animated: boolean;
};

export const FRAMES: Frame[] = [
  { id: "sakura", name: "Sakura Drift", blurb: "Blossoms that never stop falling.", priceUsd: 0, rarity: "common", animated: true },
  { id: "doodle", name: "Margin Doodles", blurb: "Scribbled straight from the sketchbook.", priceUsd: 0, rarity: "common", animated: false },
  { id: "pixel", name: "8-Bit Ring", blurb: "Insert coin to continue.", priceUsd: 0, rarity: "common", animated: false },
  { id: "kitty", name: "Kitty Ears", blurb: "Mlem. Bow included.", priceUsd: 1.99, rarity: "rare", animated: false },
  { id: "paint", name: "Wet Paint", blurb: "Still dripping. Don't touch.", priceUsd: 1.99, rarity: "rare", animated: true },
  { id: "neon", name: "Neon Pulse", blurb: "A ring that hums after dark.", priceUsd: 2.99, rarity: "epic", animated: true },
  { id: "flame", name: "Ember Crown", blurb: "Fuel your creativity. Literally.", priceUsd: 2.99, rarity: "epic", animated: true },
  { id: "stardust", name: "Stardust Orbit", blurb: "Three tiny stars on patrol.", priceUsd: 2.99, rarity: "epic", animated: true },
  { id: "holo", name: "Holo Foil", blurb: "Catches the light like a rare pull.", priceUsd: 3.99, rarity: "legendary", animated: true },
  { id: "crown", name: "Golden Crown", blurb: "For the main character.", priceUsd: 3.99, rarity: "legendary", animated: false },
];

export const FRAME_IDS = FRAMES.map((f) => f.id);

export const frameById = (id: string | undefined | null) => FRAMES.find((f) => f.id === id);

export const isFreeFrame = (id: string) => frameById(id)?.priceUsd === 0;

export const formatFramePrice = (frame: Frame) => (frame.priceUsd === 0 ? "Free" : `$${frame.priceUsd.toFixed(2)}`);
