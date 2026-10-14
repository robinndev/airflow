import { EXTENSION, formatOfMime } from "./formats.ts";

/*
 * Every uploaded picture is kept up to three ways (roadmap: "original images,
 * cheap and safe"), all made in the browser at upload time:
 *
 *   display   art/<user>/<folder>/<uuid>.<ext>         long side ≤ 2400px; what pages show
 *   thumb     art/<user>/<folder>/<uuid>.thumb.<ext>   long side ≤ 1024px; walls, cards, Explore
 *   original  originals/<user>/<folder>/<uuid>.<ext>   the file as uploaded, metadata stripped (private)
 *
 * Thumb and original paths come from the display path, so rows only store
 * their size and type (`StoredImage.thumb` / `.original`).
 *
 * Art is served straight from storage's CDN, never through Vercel's image
 * optimizer (it re-encoded our WebP a second time and is the priciest
 * bandwidth): `next.config.ts` points `next/image` at `./loader.ts`, which
 * picks the thumb or the display copy for each width the browser asks for.
 */

export const THUMB_MAX = 1024;

export type ThumbInfo = { width: number; height: number; type: "image/webp" | "image/jpeg" | "image/png" };
export type OriginalInfo = {
  width: number;
  height: number;
  type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  bytes: number;
};

const stem = (path: string) => path.replace(/\.[a-z0-9]+$/i, "");
const extensionOf = (type: string) => EXTENSION[formatOfMime(type) ?? "webp"];

export const thumbPathOf = (path: string, thumb: Pick<ThumbInfo, "type">) => `${stem(path)}.thumb.${extensionOf(thumb.type)}`;
export const originalPathOf = (path: string, original: Pick<OriginalInfo, "type">) => `${stem(path)}.${extensionOf(original.type)}`;

/**
 * Marks a display URL with its thumb for the loader: `…/<uuid>.webp#thumb=1024.webp`
 * (the thumb's width and extension). Browsers never send the fragment, so the
 * URL still works anywhere else and the CDN caches one copy per file.
 */
export function withThumb(url: string, thumb: Pick<ThumbInfo, "width" | "type"> | null | undefined) {
  return thumb ? `${url}#thumb=${thumb.width}.${extensionOf(thumb.type)}` : url;
}

/** Demo art (public/demo-art/, `npm run demo:art`) has a `.thumb.webp` beside each file, up to this wide. */
export const DEMO_THUMB_WIDTH = 1024;

/**
 * The URL to fetch for `src` drawn `width` pixels wide: the thumb when it's
 * wide enough, otherwise the display copy. The `#w=` fragment only tells
 * candidates apart (next/image expects every width to get its own URL); it
 * never reaches the server.
 */
export function pickVariant(src: string, width: number) {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const hash = src.indexOf("#");
  const base = hash < 0 ? src : src.slice(0, hash);
  const thumb = hash < 0 ? null : /(?:^|&)thumb=(\d+)\.(webp|jpg|png)(?:&|$)/.exec(src.slice(hash + 1));

  let url = base;
  if (thumb && width <= Number(thumb[1])) url = `${stem(base)}.thumb.${thumb[2]}`;
  else if (base.startsWith("/demo-art/") && !base.includes(".thumb.") && width <= DEMO_THUMB_WIDTH) url = `${stem(base)}.thumb.webp`;
  return `${url}#w=${width}`;
}

/** The URL without our `#…` hints (thumb, width), as the server sees it. */
export const withoutHints = (src: string) => src.split("#")[0];

/** An animated GIF (by its file, never by the hints). */
export const isGif = (src: string) => /\.gif$/i.test(withoutHints(src));
