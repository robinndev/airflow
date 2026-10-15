import type { CSSProperties } from "react";
import { artUrl } from "@/lib/art-storage";
import { contrast, luminance, readableOn } from "./contrast";
import { NAME_FONTS, THEME_PRESETS, type Customization } from "./model";

/*
 * Turns a (gated) customization into what the profile renders: CSS variables
 * on the profile canvas, so every existing component (bg-surface, text-ink,
 * bg-accent…) picks up the artist's palette with no per-component work.
 * The "site" preset sets nothing and the page follows the viewer's Aqua/Ember.
 */

const BUTTON_RADII = { rounded: "12px", pill: "999px", square: "4px", sketch: "255px 15px 225px 15px / 15px 225px 15px 255px" };

/** The palette in effect, or null when the profile follows the site theme. */
export function resolvePalette(c: Customization) {
  const preset = THEME_PRESETS[c.theme.preset];
  const canvas = c.theme.canvas ?? (preset.canvas || null);
  const surface = c.theme.surface ?? (preset.surface || null);
  const ink = c.theme.ink ?? (preset.ink || null);
  const accent = c.theme.accent ?? (preset.accent || null);
  if (!canvas || !surface || !ink || !accent) return null;
  return { canvas, surface, ink, accent, dark: luminance(canvas) < 0.2 };
}

export function canvasStyle(c: Customization): CSSProperties {
  const style: Record<string, string> = {
    "--profile-radius-action": BUTTON_RADII[c.buttons.shape],
  };

  const palette = resolvePalette(c);
  if (palette) {
    const { canvas, surface, ink, accent, dark } = palette;
    // White text unless the accent is light enough to need dark text.
    const onAccent = contrast(accent, "#ffffff") >= 3 ? "#ffffff" : dark ? canvas : ink;
    Object.assign(style, {
      colorScheme: dark ? "dark" : "light",
      "--canvas": canvas,
      "--surface": surface,
      "--ink": ink,
      "--on-ink": surface,
      "--muted": `color-mix(in oklab, ${ink} 62%, ${surface})`,
      "--border": `color-mix(in oklab, ${ink} ${dark ? 18 : 13}%, ${surface})`,
      "--ice": `color-mix(in oklab, ${accent} ${dark ? 14 : 9}%, ${surface})`,
      "--ice-strong": `color-mix(in oklab, ${accent} ${dark ? 22 : 16}%, ${surface})`,
      "--ocean": accent,
      "--ocean-ink": `color-mix(in oklab, ${accent} 78%, ${ink})`,
      "--profile-accent": accent,
      "--profile-accent-strong": `color-mix(in oklab, ${accent} 78%, ${ink})`,
      "--profile-on-accent": onAccent,
      "--shadow-rgb": dark ? "0 0 0" : "23 59 91",
    });
  }

  // Buttons in their own colors (see canvasData and globals.css).
  if (c.buttons.secondary) {
    style["--btn-second"] = c.buttons.secondary;
    style["--btn-on-second"] = readableOn(c.buttons.secondary, palette);
  }
  if (c.buttons.soft) {
    style["--btn-soft"] = c.buttons.soft;
    style["--btn-on-soft"] = readableOn(c.buttons.soft, palette);
  }

  if (c.background.image) style["--profile-bg-image"] = `url("${artUrl(c.background.image.path)}")`;
  return style as CSSProperties;
}

/** The bio box's card, like the stats card beside it on the profile. */
export const BIO_BOX = "rounded-card border border-border bg-surface px-4 py-3 shadow-soft";

/**
 * The bio box: the card it sits on (the palette's card color unless the
 * artist picked one), with its text re-inked to read on it.
 */
export function bioBoxStyle(c: Customization): CSSProperties | undefined {
  if (!c.bio.box || !c.bio.color) return undefined;
  const ink = readableOn(c.bio.color, resolvePalette(c));
  return {
    backgroundColor: c.bio.color,
    borderColor: `color-mix(in oklab, ${c.bio.color} 82%, ${ink})`,
    "--ink": ink,
  } as CSSProperties;
}

/** Data attributes the canvas carries for CSS-driven options (patterns, button styles and colors). */
export function canvasData(c: Customization) {
  return {
    "data-pattern": c.background.pattern,
    "data-button-style": c.buttons.style,
    ...(c.buttons.secondary && { "data-button-second": "" }),
    ...(c.buttons.soft && { "data-button-soft": "" }),
  } as const;
}

/** Inline style + class for the display name. */
export function nameStyle(c: Customization): { style: CSSProperties; className: string } {
  const style: Record<string, string> = { fontFamily: NAME_FONTS[c.name.font].family };
  // Faces differ a lot in apparent size; the name's own font-size multiplies this.
  if (c.name.font === "hand") style["--name-scale"] = "1.35";
  if (c.name.font === "pixel") style["--name-scale"] = "0.7";

  if (c.name.gradient) {
    // The first stop repeats at the end so the shimmer effect loops seamlessly.
    style["--name-gradient"] = `linear-gradient(100deg, ${[...c.name.gradient, c.name.gradient[0]].join(", ")})`;
  } else if (c.name.color) {
    style.color = c.name.color;
  }

  const className = [
    c.name.gradient ? "name-gradient" : "",
    // An animated name from the shop takes the effect's place.
    c.name.effect !== "none" && !c.nameFx ? `name-${c.name.effect}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { style: style as CSSProperties, className };
}
