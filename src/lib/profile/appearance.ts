import type { CSSProperties } from "react";
import type {
  AccentColor,
  ArtistProfile,
  ButtonShape,
  ResolvedAppearance,
} from "./types";

const DEFAULTS: ResolvedAppearance = {
  accent: "ocean",
  bannerFocusY: 50,
  buttonShape: "rounded",
  sidebarPosition: "left",
};

/** Applies plan gating: Pro-only fields fall back to defaults on the free plan. */
export function resolveAppearance(profile: ArtistProfile): ResolvedAppearance {
  const { appearance, plan } = profile;
  const isPro = plan === "pro";

  return {
    accent: appearance.accent,
    bannerFocusY: clamp(appearance.bannerFocusY, 0, 100),
    buttonShape: isPro
      ? (appearance.buttonShape ?? DEFAULTS.buttonShape)
      : DEFAULTS.buttonShape,
    sidebarPosition: isPro
      ? (appearance.sidebarPosition ?? DEFAULTS.sidebarPosition)
      : DEFAULTS.sidebarPosition,
  };
}

// `on` is the text color placed on top of the accent; light accents get ink.
const ACCENTS: Record<AccentColor, { base: string; strong: string; on: string }> = {
  ocean: { base: "#0788f9", strong: "#0670d0", on: "#ffffff" },
  sky: { base: "#35bdf5", strong: "#0f86bd", on: "#173b5b" },
  mint: { base: "#21d4e5", strong: "#0d8f9c", on: "#173b5b" },
  lilac: { base: "#8b83f6", strong: "#5d54d6", on: "#ffffff" },
};

const BUTTON_RADII: Record<ButtonShape, string> = {
  rounded: "12px",
  pill: "999px",
  square: "4px",
};

/**
 * Profile customization is expressed as CSS variables scoped to the profile
 * root, so it costs zero JS and can't leak into global chrome (header, nav).
 */
export function appearanceStyle(appearance: ResolvedAppearance): CSSProperties {
  const accent = ACCENTS[appearance.accent];
  return {
    "--profile-accent": accent.base,
    "--profile-accent-strong": accent.strong,
    "--profile-on-accent": accent.on,
    "--profile-radius-action": BUTTON_RADII[appearance.buttonShape],
  } as CSSProperties;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
