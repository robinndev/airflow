import type { CSSProperties } from "react";
import type { NameEffect } from "./model.ts";

/*
 * Lettering, as the page renders it: the profile name and the About board's
 * text share the same gradients and effects (`name-*` rules in globals.css).
 * An effect's color travels in `--fx-color`; unset, each effect keeps its
 * own default (the accent's glow, the card-colored sticker edge, an outline
 * in the text's color, a white shimmer).
 */

export type Lettering = { gradient?: string[]; effect?: NameEffect; effectColor?: string };

export function letteringStyle({ gradient, effect = "none", effectColor }: Lettering): {
  style: CSSProperties;
  className: string;
} {
  const style: Record<string, string> = {};
  // The first stop repeats at the end so the shimmer effect loops seamlessly.
  if (gradient) style["--name-gradient"] = `linear-gradient(100deg, ${[...gradient, gradient[0]].join(", ")})`;
  if (effect !== "none" && effectColor) style["--fx-color"] = effectColor;
  const className = [gradient ? "name-gradient" : "", effect !== "none" ? `name-${effect}` : ""].filter(Boolean).join(" ");
  return { style: style as CSSProperties, className };
}
