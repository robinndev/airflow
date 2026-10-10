import type { AccentColor, ImageAsset } from "./types";

/*
 * Placeholder avatar and banner for a new account until the artist uploads
 * their own: a watercolor wash in one of a few palettes, picked from the
 * handle so it never changes. These are content (like artwork), not UI
 * theming, so they carry their own colors. Served as SVG by
 * src/app/defaults/[kind]/[file]/route.ts.
 */

const PALETTES: { colors: [string, string, string, string]; accent: AccentColor }[] = [
  { colors: ["#dff3ff", "#35bdf5", "#8b83f6", "#21d4e5"], accent: "ocean" },
  { colors: ["#fff1ea", "#ff9a8b", "#a18cd1", "#ffc3a0"], accent: "lilac" },
  { colors: ["#e9fbf4", "#4fd1a5", "#5ba4f4", "#c3f0e1"], accent: "mint" },
  { colors: ["#fff6e5", "#f6b34a", "#f5576c", "#ffd9a8"], accent: "sky" },
  { colors: ["#f2eeff", "#9f8cf6", "#f08ac4", "#c7e3ff"], accent: "lilac" },
  { colors: ["#eaf6ff", "#2f7fe0", "#21d4e5", "#ffd27a"], accent: "ocean" },
];

function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function paletteFor(handle: string) {
  return PALETTES[hash(handle) % PALETTES.length];
}

export function defaultArt(handle: string, displayName: string) {
  const { colors, accent } = paletteFor(handle);
  const avatar: ImageAsset = {
    src: `/defaults/avatar/${encodeURIComponent(handle)}.svg`,
    alt: displayName,
    width: 256,
    height: 256,
    palette: colors.slice(1),
  };
  const banner: ImageAsset = {
    src: `/defaults/banner/${encodeURIComponent(handle)}.svg`,
    alt: "",
    width: 1500,
    height: 500,
    palette: colors.slice(1),
  };
  return { avatar, banner, accent };
}

/** Blobs placed from the handle's hash, so every account gets its own wash. */
function blobs(handle: string, width: number, height: number, colors: string[]) {
  const seed = hash(`${handle}:wash`);
  return colors
    .map((color, i) => {
      const r = (seed >>> (i * 7)) & 127;
      const cx = Math.round(((r / 127) * 0.8 + 0.1) * width);
      const cy = Math.round((((seed >>> (i * 5 + 3)) & 63) / 63) * height);
      const rx = Math.round(width * (0.28 + i * 0.05));
      const ry = Math.round(height * (0.5 + i * 0.08));
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${0.75 - i * 0.12}"/>`;
    })
    .join("");
}

export function defaultSvg(kind: "avatar" | "banner", handle: string) {
  const { colors } = paletteFor(handle);
  const [paper, ...paint] = colors;
  const [width, height] = kind === "avatar" ? [256, 256] : [1500, 500];
  const blur = kind === "avatar" ? 28 : 90;
  const initial = kind === "avatar" ? escapeXml((handle.match(/[a-z0-9]/)?.[0] ?? "?").toUpperCase()) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><filter id="w" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>
<rect width="100%" height="100%" fill="${paper}"/>
<g filter="url(#w)">${blobs(handle, width, height, paint)}</g>
${
  initial
    ? `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="124" font-weight="800" fill="#ffffff" fill-opacity=".92">${initial}</text>`
    : ""
}
</svg>`;
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
