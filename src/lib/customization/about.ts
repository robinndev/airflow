import { z } from "zod";

/*
 * The "About" board: a free-form canvas artists fill with text, lists of
 * likes/DNIs, images, stickers and doodles (`profiles.about`).
 *
 * Coordinates are in board units: the board is always BOARD_WIDTH units wide
 * and scales to its container (CSS container units), so a layout looks the
 * same at every desktop width. Narrow screens stack the blocks in reading
 * order instead (see about-board.tsx).
 */

export const BOARD_WIDTH = 1000;
export const BOARD_MIN_HEIGHT = 600;
export const BOARD_MAX_HEIGHT = 4000;
export const GRID = 10;

/**
 * Board units per CSS pixel on a desktop profile, where the board fills the
 * content column (1184 max − 2 × 32 padding − 300 sidebar − 24 gap = 796px).
 */
const UNITS_PER_PX = BOARD_WIDTH / 796;

/**
 * An image's real size on the board (a 50×50 doodle stays 50×50 on a desktop
 * profile instead of being blown up and blurred), only ever shrunk, never
 * cropped, to fit inside the board's margins.
 */
export function realSize(image: { width: number; height: number }) {
  const w = image.width * UNITS_PER_PX;
  const h = image.height * UNITS_PER_PX;
  const fit = Math.min(1, (BOARD_WIDTH - 80) / w, 1200 / h);
  return { w: Math.max(20, Math.round(w * fit)), h: Math.max(20, Math.round(h * fit)) };
}

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const color = z.union([hex, z.literal("transparent")]);

const box = {
  id: z.string().regex(/^[a-z0-9-]{4,40}$/),
  x: z.number().min(-200).max(BOARD_WIDTH),
  y: z.number().min(-200).max(BOARD_MAX_HEIGHT),
  w: z.number().min(20).max(BOARD_WIDTH),
  h: z.number().min(20).max(2000),
  rotate: z.number().min(-180).max(180).default(0),
  z: z.number().int().min(0).max(999).default(1),
};

const textStyle = {
  color: hex.optional(),
  background: color.optional(),
  font: z.enum(["sans", "display", "hand", "serif", "pixel"]).default("sans"),
  size: z.number().min(10).max(120).default(18),
  align: z.enum(["left", "center", "right"]).default("left"),
};

export const STICKERS = [
  "heart", "star", "sparkle", "flower", "cloud", "moon", "crown", "paw",
  "bow", "music", "palette", "brush", "speech", "arrow", "tape", "swirl",
] as const;
export type StickerId = (typeof STICKERS)[number];

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...box, type: z.literal("text"), text: z.string().max(2000), ...textStyle }),
  z.object({
    ...box,
    type: z.literal("list"),
    title: z.string().max(60),
    items: z.array(z.string().max(120)).max(20),
    marker: z.enum(["heart", "star", "check", "cross", "dot"]).default("heart"),
    ...textStyle,
  }),
  z.object({
    ...box,
    type: z.literal("image"),
    image: z.object({ path: z.string().max(200), width: z.number(), height: z.number() }),
    alt: z.string().max(200).default(""),
    frame: z.enum(["none", "polaroid", "tape", "round"]).default("none"),
  }),
  z.object({ ...box, type: z.literal("sticker"), sticker: z.enum(STICKERS), color: hex.default("#ff6fa5") }),
  // Flow+: rendered in a sandboxed iframe with no scripts.
  z.object({ ...box, type: z.literal("html"), html: z.string().max(10_000) }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

/** A block before it's placed on the board (the editor assigns id, position and layer). */
export type NewBlock = Block extends infer B ? (B extends Block ? Omit<B, "id" | "x" | "y" | "z"> : never) : never;

export const boardSchema = z.object({
  height: z.number().min(BOARD_MIN_HEIGHT).max(BOARD_MAX_HEIGHT).default(900),
  background: color.default("transparent"),
  blocks: z.array(blockSchema).max(60).default([]),
});

export type Board = z.infer<typeof boardSchema>;

export const EMPTY_BOARD: Board = { height: 900, background: "transparent", blocks: [] };

export function readBoard(raw: unknown): Board {
  const parsed = boardSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_BOARD;
}

/** HTML blocks are Flow+; free boards also have a block cap (images are for everyone). */
export function boardPaidFeatures(board: Board, freeLimit: number): string[] {
  const used: string[] = [];
  if (board.blocks.some((b) => b.type === "html")) used.push("HTML blocks");
  if (board.blocks.length > freeLimit) used.push(`more than ${freeLimit} blocks`);
  return used;
}

/** Reading order for the stacked (mobile) layout: top to bottom, then left to right. */
export function readingOrder(blocks: Block[]) {
  return [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
}
