import "server-only";
import { ART_BUCKET, ORIGINALS_BUCKET, artUrl, filesOf, isOwnArtPath, type ArtFolder, type StoredImage } from "@/lib/art-storage";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { formatOf, readImageInfo, type ImageFormat, type ImageInfo } from "./formats";
import { ORIGINAL_LIMITS } from "./schema";
import { originalPathOf, thumbPathOf } from "./variants";

/*
 * The server's look at an upload, because a hostile browser can skip every
 * check prepareImage() makes. Before a row points at a picture, its files
 * must be in the uploader's folder, really be the format their name says
 * (never SVG or HTML dressed as a PNG), match the size the browser declared,
 * and stay under the caps that keep a "decompression bomb" from freezing
 * the tabs of whoever looks at it. Reads are ranged (the first 64 KB), except
 * GIFs, which are read whole to count their frames.
 */

const HEAD_BYTES = 64 * 1024;
/** Animated GIFs: frames, and pixels across all frames (a 1000×1000 GIF with 400 frames is the most). */
export const GIF_LIMITS = { frames: 2000, pixels: 400_000_000 };

export type VerifyResult = { ok: true; images: StoredImage[] } | { ok: false; error: string };

type Fetched = { bytes: Uint8Array; total: number } | null;

const EXT_FORMAT: Record<string, ImageFormat> = { png: "png", jpg: "jpeg", webp: "webp", gif: "gif" };

/**
 * The file's first bytes (or all of it), and its full size. A JPEG whose
 * size sits past the first 64 KB (big color profiles do that) is read whole.
 */
async function read(url: string, whole = false): Promise<Fetched> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: whole ? {} : { Range: `bytes=0-${HEAD_BYTES - 1}` },
  }).catch(() => null);
  if (!res || !(res.ok || res.status === 206)) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const range = /\/(\d+)$/.exec(res.headers.get("content-range") ?? "");
  const total = range ? Number(range[1]) : bytes.length;
  if (!whole && bytes.length < total && !readImageInfo(bytes) && total <= ORIGINAL_LIMITS.bytes) return read(url, true);
  return { bytes, total };
}

/** What's wrong with these bytes as a `format` picture of this size, or null when they're fine. */
function problemWith(file: Fetched, format: ImageFormat, size: { width: number; height: number }, gifWhole = false) {
  if (!file) return "missing";
  if (formatOf(file.bytes) !== format) return "not what its name says";
  const info: ImageInfo | null = readImageInfo(file.bytes);
  if (!info) return "unreadable";
  if (info.width !== size.width || info.height !== size.height) return "not the size declared";
  if (format === "gif" && gifWhole) {
    if (info.frames > GIF_LIMITS.frames || info.frames * info.width * info.height > GIF_LIMITS.pixels) return "too many frames";
  }
  return null;
}

/**
 * Checks pictures the browser uploaded, before a row points at them. Images
 * already saved (in `known`, by path) keep what was stored. A thumb or an
 * original that's missing is left out (the display copy stands in); anything
 * that isn't what it claims refuses the picture and removes its files.
 */
export async function verifyUploads(
  images: StoredImage[],
  { userId, folder, known = [] }: { userId: string; folder: ArtFolder; known?: StoredImage[] },
): Promise<VerifyResult> {
  const saved = new Map(known.map((image) => [image.path, image]));
  const checked = await Promise.all(
    images.map(async (image) => (saved.has(image.path) ? { image: saved.get(image.path)! } : verifyOne(image, userId, folder))),
  );
  const refused = checked.find((result) => "error" in result);
  if (refused && "error" in refused) {
    await removeFiles(images.filter((image) => !saved.has(image.path) && isOwnArtPath(image.path, userId, folder)));
    return { ok: false, error: refused.error };
  }
  return { ok: true, images: checked.map((result) => ("image" in result ? result.image : null)).filter((image) => image !== null) };
}

async function verifyOne(image: StoredImage, userId: string, folder: ArtFolder): Promise<{ image: StoredImage } | { error: string }> {
  if (!isOwnArtPath(image.path, userId, folder)) return { error: "One of those pictures isn't yours. Upload it again." };
  const format = EXT_FORMAT[image.path.split(".").pop() ?? ""];
  const gif = format === "gif";

  const { thumb, original } = image;
  const admin = original ? createSupabaseAdmin() : null;
  const signed = original && admin
    ? (await admin.storage.from(ORIGINALS_BUCKET).createSignedUrl(originalPathOf(image.path, original), 60)).data?.signedUrl
    : null;
  const [display, thumbFile, originalFile] = await Promise.all([
    read(artUrl(image.path), gif),
    thumb ? read(artUrl(thumbPathOf(image.path, thumb))) : null,
    signed ? read(signed) : null,
  ]);

  const displayProblem = problemWith(display, format, image, gif);
  if (displayProblem === "missing") return { error: "A picture didn't upload. Try adding it again." };
  if (displayProblem) return { error: "That picture isn't what its name says. Try exporting it again as PNG, JPG, WebP or GIF." };

  const result: StoredImage = { path: image.path, width: image.width, height: image.height, palette: image.palette ?? [] };
  if (thumb) {
    const problem = problemWith(thumbFile, EXT_FORMAT[thumbPathOf(image.path, thumb).split(".").pop()!], thumb);
    if (problem && problem !== "missing") return { error: "That picture isn't what its name says. Try adding it again." };
    if (!problem) result.thumb = { width: thumb.width, height: thumb.height, type: thumb.type };
  }
  if (original) {
    const fmt = EXT_FORMAT[originalPathOf(image.path, original).split(".").pop()!];
    const problem = problemWith(originalFile, fmt, original);
    if (problem && problem !== "missing") return { error: "That picture isn't what its name says. Try adding it again." };
    const tooBig =
      originalFile !== null &&
      (originalFile.total > ORIGINAL_LIMITS.bytes || original.width * original.height > ORIGINAL_LIMITS.pixels);
    if (tooBig) return { error: "That picture is too large. Try one under 100 megapixels and 25 MB." };
    if (!problem && originalFile) result.original = { ...original, bytes: originalFile.total };
  }
  return { image: result };
}

/** Removes every file behind these images (display, thumb, original), as the server. */
export async function removeFiles(images: (StoredImage | null | undefined)[]) {
  const { art, originals } = filesOf(images);
  if (art.length === 0 && originals.length === 0) return;
  const admin = createSupabaseAdmin();
  await Promise.all([
    art.length ? admin.storage.from(ART_BUCKET).remove(art).catch(() => null) : null,
    originals.length ? admin.storage.from(ORIGINALS_BUCKET).remove(originals).catch(() => null) : null,
  ]);
}
