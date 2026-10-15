/*
 * Color math for customizations (pure, client-safe): how light a color is,
 * how much two colors stand apart (WCAG contrast), and which text reads on a
 * color the artist picked.
 */

export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Text that reads on a color the artist picked (a button, the bio box): the
 * palette's own ink or card color when one stands out enough (4.5:1), else
 * near-black or white, whichever stands out more.
 */
export function readableOn(color: string, palette: { ink: string; surface: string } | null) {
  const best = (options: string[]) => options.toSorted((a, b) => contrast(color, b) - contrast(color, a))[0];
  const own = palette && best([palette.ink, palette.surface]);
  return own && contrast(color, own) >= 4.5 ? own : best(["#ffffff", "#141414"]);
}
