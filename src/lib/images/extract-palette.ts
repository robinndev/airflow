/*
 * Dominant colors of an artwork (`ImageAsset.palette`). Pure (RGB pixels in,
 * hex colors out), so the same code runs in the browser when someone posts
 * (src/lib/images/prepare.ts) and in `npm run demo:palettes`.
 */

type Lab = [number, number, number];

/** Long side to shrink the image to before clustering. */
export const SAMPLE_SIZE = 72;
const CLUSTERS = 8;
const ITERATIONS = 20;
const MAX_COLORS = 5;
/** Clusters smaller than this share of the pixels are noise. */
const MIN_SHARE = 0.01;
/** Clusters closer than this (ΔE) are the same color. */
const MERGE_DISTANCE = 14;
/** A border pixel within this ΔE of the median border color counts as backdrop. */
const BACKDROP_DISTANCE = 10;
/** Share of the border that must be backdrop for the image to have a flat one. */
const BACKDROP_SHARE = 0.7;
/**
 * Only light backdrops (paper, cream) are dropped. A uniform night sky also
 * fills the border, but it's part of the art (snow-village is the test case).
 */
const MIN_BACKDROP_LIGHTNESS = 70;
/** Pixels less opaque than this (0–255) aren't part of the art. */
const MIN_ALPHA = 128;

function toLab([r, g, b]: number[]): Lab {
  const linear = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [linear(r), linear(g), linear(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const deltaE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Dominant colors, most prominent first: k-means in CIELAB (so clusters
 * follow what the eye sees), near-duplicates merged, and flat backdrops —
 * white paper, cream — dropped so a sketch on paper isn't "mostly white".
 * See-through pixels are left out: their color is usually black, which made
 * every transparent PNG "mostly black".
 *
 * @param pixels RGB triplets, row by row (no alpha), ideally ~72px on the long side.
 * @param alpha One opacity (0–255) per pixel, when the image has transparency.
 */
export function extractPalette(pixels: Uint8Array | number[], width: number, height: number, alpha?: ArrayLike<number>): string[] {
  // Every pixel in reading order, null where it's see-through; rgb and lab hold only the visible ones.
  const grid: (Lab | null)[] = [];
  const rgb: number[][] = [];
  for (let i = 0, p = 0; i < pixels.length; i += 3, p++) {
    if (alpha && alpha[p] < MIN_ALPHA) {
      grid.push(null);
      continue;
    }
    const color = [pixels[i], pixels[i + 1], pixels[i + 2]];
    rgb.push(color);
    grid.push(toLab(color));
  }
  const lab = grid.filter((p): p is Lab => p !== null);
  if (lab.length === 0) return [];

  // k-means++ seeding with a fixed seed, so the same image always gives the same palette.
  let seed = 42;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const centers: Lab[] = [lab[Math.floor(random() * lab.length)]];
  while (centers.length < CLUSTERS) {
    const weights = lab.map((p) => Math.min(...centers.map((c) => deltaE(p, c))) ** 2);
    let target = random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (target > weights[i]) target -= weights[i++];
    centers.push(lab[Math.min(i, lab.length - 1)]);
  }

  let assignment: number[] = [];
  for (let it = 0; it < ITERATIONS; it++) {
    assignment = lab.map((p) => {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((c, k) => {
        const d = deltaE(p, c);
        if (d < bestDistance) [best, bestDistance] = [k, d];
      });
      return best;
    });
    for (let k = 0; k < CLUSTERS; k++) {
      const members = lab.filter((_, i) => assignment[i] === k);
      if (members.length) centers[k] = [0, 1, 2].map((j) => members.reduce((a, p) => a + p[j], 0) / members.length) as Lab;
    }
  }

  const clusters = centers
    .map((center, k) => {
      const members = assignment.flatMap((a, i) => (a === k ? [i] : []));
      const color = [0, 1, 2].map((j) => members.reduce((a, i) => a + rgb[i][j], 0) / Math.max(1, members.length));
      return { lab: center, rgb: color, share: members.length / lab.length };
    })
    .filter((c) => c.share > MIN_SHARE)
    .sort((a, b) => b.share - a.share);

  const distinct: typeof clusters = [];
  for (const c of clusters) if (!distinct.some((d) => deltaE(d.lab, c.lab) < MERGE_DISTANCE)) distinct.push(c);

  // The backdrop is the median color of the border, if it's light and most of the border is that color.
  // A see-through border counts against it: transparency is already the backdrop.
  const edge: (Lab | null)[] = [];
  for (let x = 0; x < width; x++) edge.push(grid[x], grid[(height - 1) * width + x]);
  for (let y = 0; y < height; y++) edge.push(grid[y * width], grid[y * width + width - 1]);
  const border = edge.filter((p): p is Lab => p !== null);
  const backdrop = [0, 1, 2].map((j) => border.map((p) => p[j]).sort((a, b) => a - b)[Math.floor(border.length / 2)]) as Lab;
  const flat =
    border.length > 0 &&
    backdrop[0] > MIN_BACKDROP_LIGHTNESS &&
    border.filter((p) => deltaE(p, backdrop) < BACKDROP_DISTANCE).length / edge.length > BACKDROP_SHARE;
  const art = flat ? distinct.filter((c) => deltaE(c.lab, backdrop) >= MERGE_DISTANCE) : distinct;

  return art.slice(0, MAX_COLORS).map((c) => toHex(c.rgb));
}
