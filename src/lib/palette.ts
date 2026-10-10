/*
 * Palette moods: browse art by the colors it's made of. Each artwork's
 * extracted palette (`ImageAsset.palette`) is scored in CIELAB, so "light",
 * "muted" and "warm" follow what the eye sees rather than raw RGB values.
 * A piece can sit in more than one mood (a dark, warm city is both
 * Midnight and Golden Hour).
 */

export type MoodSlug = "cotton-candy" | "golden-hour" | "tidepool" | "fern" | "midnight" | "graphite";

export type Mood = {
  slug: MoodSlug;
  name: string;
  /** Paint-chip catalogue number, purely decorative. */
  code: string;
  /** Representative swatches, light to dark. Content, not UI theming. */
  swatches: string[];
  hint: string;
};

export const MOODS: Mood[] = [
  {
    slug: "cotton-candy",
    name: "Cotton Candy",
    code: "AF-112",
    swatches: ["#fde6f0", "#f6c4da", "#dcc9f6", "#bfe2f6", "#f2a7c3"],
    hint: "Soft pastels",
  },
  {
    slug: "golden-hour",
    name: "Golden Hour",
    code: "AF-208",
    swatches: ["#ffe3a6", "#f8b45a", "#e9783e", "#c44e33", "#6f2f29"],
    hint: "Warm light",
  },
  {
    slug: "tidepool",
    name: "Tidepool",
    code: "AF-317",
    swatches: ["#d6f2fb", "#86d3ef", "#35a5dc", "#1f6eae", "#163f6a"],
    hint: "Blues & teals",
  },
  {
    slug: "fern",
    name: "Fern & Moss",
    code: "AF-421",
    swatches: ["#e6eecb", "#b6cd7c", "#7e9d52", "#506b3b", "#2e3e27"],
    hint: "Greens & earth",
  },
  {
    slug: "midnight",
    name: "Midnight",
    code: "AF-509",
    swatches: ["#5a5f96", "#3b3f74", "#272a55", "#191b3a", "#0d0e20"],
    hint: "Dark & moody",
  },
  {
    slug: "graphite",
    name: "Graphite",
    code: "AF-600",
    swatches: ["#f1f1f1", "#c8c8c8", "#989898", "#5f5f5f", "#2b2b2b"],
    hint: "Ink & mono",
  },
];

// Palettes are ordered by prominence; weigh them roughly by area.
const RANK_WEIGHT = [0.4, 0.25, 0.16, 0.11, 0.08];

function toLab(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

type HueFamily = "rose" | "warm" | "green" | "blue";

function hueFamily(hue: number): HueFamily {
  if (hue >= 330 || hue < 28) return "rose";
  if (hue < 105) return "warm";
  if (hue < 170) return "green";
  return "blue";
}

export function moodsOf(palette: string[] = []): MoodSlug[] {
  const colors = palette.slice(0, RANK_WEIGHT.length).map((hex, i) => {
    const [L, a, b] = toLab(hex);
    return { L, C: Math.hypot(a, b), hue: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, w: RANK_WEIGHT[i] };
  });
  if (colors.length === 0) return [];

  const total = colors.reduce((sum, c) => sum + c.w, 0);
  const lightness = colors.reduce((sum, c) => sum + c.L * c.w, 0) / total;
  const chroma = colors.reduce((sum, c) => sum + c.C * c.w, 0) / total;
  const moods = new Set<MoodSlug>();

  if (chroma < 8 && colors.slice(0, 3).every((c) => c.C < 22)) moods.add("graphite");
  if (lightness < 38) moods.add("midnight");
  if (lightness > 66 && chroma >= 9 && chroma < 42) moods.add("cotton-candy");

  if (chroma >= 7) {
    const families: Record<HueFamily, number> = { rose: 0, warm: 0, green: 0, blue: 0 };
    for (const c of colors) if (c.C >= 12) families[hueFamily(c.hue)] += c.w * c.C;
    const sum = Object.values(families).reduce((a, b) => a + b, 0);
    const leads = (family: HueFamily) => sum > 0 && families[family] / sum >= 0.42;
    if (leads("rose")) moods.add(lightness > 50 ? "cotton-candy" : "golden-hour");
    if (leads("warm") && chroma >= 12) moods.add("golden-hour");
    if (leads("green")) moods.add("fern");
    if (leads("blue") && chroma >= 10) moods.add("tidepool");
  }
  return [...moods];
}
