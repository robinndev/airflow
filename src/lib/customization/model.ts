import { z } from "zod";

/*
 * Profile customization: everything an artist can change about how their
 * page looks, stored as one JSON document (`profiles.customization`).
 *
 * Free accounts get a curated, always-readable subset; Flow+ unlocks the
 * rest (see `gateCustomization`). Paid fields are kept, not deleted, when a
 * plan lapses — they simply stop applying, and come back on renewal.
 * Site chrome (header, checkout, safety UI) is never customizable.
 */

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a #rrggbb color.");

export const THEME_PRESETS = {
  site: { label: "Follow the site", canvas: "", surface: "", ink: "", accent: "" },
  aqua: { label: "Aqua", canvas: "#f6fbff", surface: "#ffffff", ink: "#173b5b", accent: "#0788f9" },
  ember: { label: "Ember", canvas: "#0b101c", surface: "#171c2b", ink: "#f4f5fa", accent: "#ff3948" },
  sakura: { label: "Sakura", canvas: "#fff4f6", surface: "#ffffff", ink: "#5a2236", accent: "#f0679a" },
  midnight: { label: "Midnight", canvas: "#0d0b1f", surface: "#1a1636", ink: "#ece8ff", accent: "#9d7bff" },
  forest: { label: "Forest", canvas: "#f1f5ec", surface: "#fbfdf8", ink: "#24361f", accent: "#4f8a3a" },
  paper: { label: "Sketchbook", canvas: "#f4efe4", surface: "#fffdf7", ink: "#2c2a26", accent: "#d9572b" },
  bubblegum: { label: "Bubblegum", canvas: "#fdf2ff", surface: "#ffffff", ink: "#3d2559", accent: "#c04dff" },
  arcade: { label: "Arcade", canvas: "#06141b", surface: "#0e2530", ink: "#d9fff6", accent: "#00e0b4" },
} as const;

export type ThemePreset = keyof typeof THEME_PRESETS;

export const NAME_FONTS = {
  // Raw font variables: Tailwind's --font-* theme tokens aren't emitted at runtime.
  display: { label: "Studio", family: "var(--display-font)" },
  hand: { label: "Handwritten", family: "var(--font-caveat), 'Bradley Hand', cursive" },
  serif: { label: "Storybook", family: "var(--font-serif), Georgia, serif" },
  pixel: { label: "Pixel", family: "var(--font-pixel), monospace" },
} as const;

export const NAME_EFFECTS = ["none", "glow", "sticker", "outline", "shimmer"] as const;
export const BUTTON_SHAPES = ["rounded", "pill", "square", "sketch"] as const;
export const BUTTON_STYLES = ["solid", "soft", "outline"] as const;
export const PATTERNS = ["none", "dots", "grid", "paper", "stars", "hearts"] as const;

export const CSS_MAX = 20_000;

export const customizationSchema = z.object({
  theme: z
    .object({
      preset: z.enum(Object.keys(THEME_PRESETS) as [ThemePreset, ...ThemePreset[]]).default("site"),
      /** Custom colors (Flow+) override the preset. */
      canvas: hex.optional(),
      surface: hex.optional(),
      ink: hex.optional(),
      accent: hex.optional(),
    })
    .default({ preset: "site" }),
  background: z
    .object({
      pattern: z.enum(PATTERNS).default("none"),
      /** An uploaded image behind the page (Flow+). */
      image: z.object({ path: z.string().max(200), width: z.number(), height: z.number() }).optional(),
    })
    .default({ pattern: "none" }),
  name: z
    .object({
      font: z.enum(Object.keys(NAME_FONTS) as [keyof typeof NAME_FONTS, ...(keyof typeof NAME_FONTS)[]]).default("display"),
      color: hex.optional(),
      /** Two or three stops; wins over `color` (Flow+). */
      gradient: z.array(hex).min(2).max(3).optional(),
      effect: z.enum(NAME_EFFECTS).default("none"),
    })
    .default({ font: "display", effect: "none" }),
  buttons: z
    .object({
      shape: z.enum(BUTTON_SHAPES).default("rounded"),
      style: z.enum(BUTTON_STYLES).default("solid"),
      /**
       * Flow+: each kind of button in its own color. The main one (Follow,
       * Request) takes the accent; these are the second (Message, Edit
       * profile) and the soft one (Commission, Customize).
       */
      secondary: hex.optional(),
      soft: hex.optional(),
    })
    .default({ shape: "rounded", style: "solid" }),
  /** The headline and bio on a card of their own, so they read on any background; its color is Flow+. */
  bio: z.object({ box: z.boolean().default(false), color: hex.optional() }).default({ box: false }),
  layout: z
    .object({ sidebar: z.enum(["left", "right"]).default("left") })
    .default({ sidebar: "left" }),
  /** Equipped avatar frame (see src/lib/frames.ts); must be owned or free. */
  frame: z.string().max(40).optional(),
  /** From the shop (src/lib/shop/catalog.ts), each owned or free: a profile effect, an animated name, an animated cover, a pin. */
  effect: z.string().max(40).optional(),
  nameFx: z.string().max(40).optional(),
  coverFx: z.string().max(40).optional(),
  pin: z.string().max(40).optional(),
  /** Flow+: sanitized and scoped to the profile (see css.ts). */
  css: z.string().max(CSS_MAX).optional(),
});

export type Customization = z.infer<typeof customizationSchema>;

export const DEFAULT_CUSTOMIZATION: Customization = customizationSchema.parse({});

/** Free accounts: what they can pick. Everything else is Flow+. */
export const FREE = {
  presets: ["site", "aqua", "ember", "sakura", "midnight"] as ThemePreset[],
  nameFonts: ["display", "hand"] as (keyof typeof NAME_FONTS)[],
  nameEffects: ["none", "glow"] as (typeof NAME_EFFECTS)[number][],
  buttonShapes: ["rounded", "pill"] as (typeof BUTTON_SHAPES)[number][],
  patterns: ["none", "dots"] as (typeof PATTERNS)[number][],
  aboutBlocks: 10,
};

export const PAID_ABOUT_BLOCKS = 60;

/**
 * What actually applies for this plan. Free accounts keep the safe subset;
 * paid-only choices fall back to the defaults instead of erroring, so a
 * lapsed subscription degrades gracefully.
 */
export function gateCustomization(input: Customization, paid: boolean): Customization {
  if (paid) return input;
  const c = structuredClone(input);
  if (!FREE.presets.includes(c.theme.preset)) c.theme.preset = "site";
  c.theme = { preset: c.theme.preset };
  if (!FREE.patterns.includes(c.background.pattern)) c.background.pattern = "none";
  delete c.background.image;
  if (!FREE.nameFonts.includes(c.name.font)) c.name.font = "display";
  if (!FREE.nameEffects.includes(c.name.effect)) c.name.effect = "none";
  delete c.name.gradient;
  if (!FREE.buttonShapes.includes(c.buttons.shape)) c.buttons.shape = "rounded";
  c.buttons.style = "solid";
  delete c.buttons.secondary;
  delete c.buttons.soft;
  delete c.bio.color;
  c.layout.sidebar = "left";
  delete c.css;
  return c;
}

/** Fields the editor marks with a Flow+ badge — and the server refuses to save for free accounts. */
export function paidFieldsUsed(c: Customization): string[] {
  const used: string[] = [];
  if (!FREE.presets.includes(c.theme.preset)) used.push(`the ${THEME_PRESETS[c.theme.preset].label} theme`);
  if (c.theme.canvas || c.theme.surface || c.theme.ink || c.theme.accent) used.push("custom colors");
  if (!FREE.patterns.includes(c.background.pattern)) used.push("that background pattern");
  if (c.background.image) used.push("a background image");
  if (!FREE.nameFonts.includes(c.name.font)) used.push("that name font");
  if (!FREE.nameEffects.includes(c.name.effect)) used.push("that name effect");
  if (c.name.gradient) used.push("a gradient name");
  if (!FREE.buttonShapes.includes(c.buttons.shape)) used.push("that button shape");
  if (c.buttons.style !== "solid") used.push("button styles");
  if (c.buttons.secondary || c.buttons.soft) used.push("button colors");
  if (c.bio.color) used.push("a bio box color");
  if (c.layout.sidebar !== "left") used.push("moving the sidebar");
  if (c.css?.trim()) used.push("custom CSS");
  return used;
}

/** Parses whatever is stored, falling back to defaults on anything malformed. */
export function readCustomization(raw: unknown): Customization {
  const parsed = customizationSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_CUSTOMIZATION;
}

/** What the artist saved (or the older `appearance` fields for profiles that predate customization). */
export function savedCustomization(profile: {
  customization?: Customization;
  appearance: { buttonShape?: string; sidebarPosition?: string };
}): Customization {
  if (profile.customization) return profile.customization;
  const shape = (BUTTON_SHAPES as readonly string[]).includes(profile.appearance.buttonShape ?? "")
    ? (profile.appearance.buttonShape as Customization["buttons"]["shape"])
    : "rounded";
  return {
    ...DEFAULT_CUSTOMIZATION,
    buttons: { shape, style: "solid" },
    layout: { sidebar: profile.appearance.sidebarPosition === "right" ? "right" : "left" },
  };
}

/** The customization a profile renders with: what was saved, gated by plan. */
export function customizationFor(profile: {
  plan: "free" | "pro";
  customization?: Customization;
  appearance: { buttonShape?: string; sidebarPosition?: string };
}): Customization {
  return gateCustomization(savedCustomization(profile), profile.plan === "pro");
}
