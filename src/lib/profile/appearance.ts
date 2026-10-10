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

// Accents point at theme tokens, so an artist's pick renders in the active
// theme's palette (Aqua ocean → Ember red, sky → flame, mint → blaze, lilac →
// violet). `strong` is the readable text tone; `on` is text placed on the accent.
const ACCENTS: Record<AccentColor, { base: string; strong: string; on: string }> = {
  ocean: { base: "var(--ocean)", strong: "var(--ocean-ink)", on: "#ffffff" },
  sky: { base: "var(--sky)", strong: "var(--sky-ink)", on: "var(--on-sky)" },
  mint: { base: "var(--mint)", strong: "var(--mint-strong)", on: "var(--on-mint)" },
  lilac: { base: "var(--lilac)", strong: "var(--lilac-ink)", on: "#ffffff" },
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
