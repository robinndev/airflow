import type { ImageAsset } from "@/lib/profile/types";

/*
 * How a piece hangs on the wall (and anywhere that borrows its look): the
 * tile takes the art's shape, kept between a tall 1:2 and a wide 12:5, and
 * the art sits whole on a mat tinted with its own main color.
 */

export const cellRatio = ({ width, height }: Pick<ImageAsset, "width" | "height">) =>
  Math.min(2.4, Math.max(0.5, width / height));

/**
 * The mat behind a piece: its main color, barely there, over the theme's
 * surface. The raw theme variables, so it follows any re-scoped palette (an
 * artist's profile canvas, a data-theme preview); `--color-*` resolve at :root.
 */
export const matOf = (palette?: string[]) =>
  palette?.[0] ? `color-mix(in oklab, ${palette[0]} 14%, var(--surface))` : "var(--ice)";
