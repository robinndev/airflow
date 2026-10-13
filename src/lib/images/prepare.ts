import { assertMadeByHumans } from "@/lib/ai-check/browser";
import { ART_BUCKET, ORIGINALS_BUCKET, filesOf, type ArtFolder, type StoredImage } from "@/lib/art-storage";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { SAMPLE_SIZE, extractPalette } from "./extract-palette";
import { MIME_TYPE, formatOf, readImageInfo, stripMetadata } from "./formats";
import { ORIGINAL_LIMITS } from "./schema";
import { THUMB_MAX, originalPathOf, thumbPathOf, type OriginalInfo, type ThumbInfo } from "./variants";

/** The `art` bucket takes files up to 10 MB; stay a little under. */
const MAX_BYTES = 9_500_000;
/** The private `originals` bucket takes files up to 25 MB. */
const ORIGINAL_MAX_BYTES = ORIGINAL_LIMITS.bytes;
/** Images this small (long side) are kept pixel-exact as PNG when PNG is allowed: lossy WebP smears pixel art and tiny doodles. */
const LOSSLESS_MAX_SIDE = 640;

/** A region of the original image, in its pixels (from <ImageCropDialog>). */
export type CropRect = { x: number; y: number; width: number; height: number };

export type PreparedImage = {
  blob: Blob;
  type: "image/webp" | "image/jpeg" | "image/png" | "image/gif";
  width: number;
  height: number;
  /** Object URL for the local preview; revoke it when done. */
  previewUrl: string;
  /** Dominant colors, for the feed's light and placeholders (see extract-palette.ts). */
  palette: string[];
  /** With `thumb`: a smaller copy for walls and cards (only when the picture is bigger than one; GIFs get their first frame). */
  thumb?: ThumbInfo & { blob: Blob };
  /** With `original`: the file as chosen, metadata stripped, pixels untouched (not for GIFs: their display copy is the file). */
  original?: OriginalInfo & { blob: Blob };
};

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Gets an image ready to upload, in the browser: cropped (optional), resized
 * to `maxDimension` (never enlarged), re-encoded as WebP, which also strips
 * EXIF metadata such as location, and its palette extracted.
 *
 * With `allowPng` (the `art` bucket takes PNG; `messages` doesn't), small
 * images stay lossless PNG, and so do transparent ones in browsers that can't
 * encode WebP (Safari), where the JPEG fallback would paint the see-through
 * parts black. Without it, transparency survives wherever WebP does.
 *
 * Animated GIFs (Flow+) are uploaded as they are: re-encoding through a
 * canvas would freeze them on the first frame, so they can't be cropped yet.
 *
 * Files carrying an AI generator's marks are turned away first, while the
 * marks are still there: it throws an AiImageError (show <AiImageDialog>).
 *
 * `thumb` adds a copy up to 1024px for walls and cards; `original` keeps the
 * file itself, cleaned of metadata (location, camera, names) without
 * re-encoding. A crop doesn't apply to the original. See variants.ts.
 */
export async function prepareImage(
  file: File,
  maxDimension: number,
  {
    allowGif = false,
    allowPng = false,
    crop,
    thumb: wantThumb = false,
    original: wantOriginal = false,
  }: { allowGif?: boolean; allowPng?: boolean; crop?: CropRect; thumb?: boolean; original?: boolean } = {},
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const gif = file.type === "image/gif";
  if (gif && !allowGif) throw new Error("Animated GIFs come with Flow+. Pick a PNG, JPG or WebP.");
  if (gif && file.size > MAX_BYTES) throw new Error("That GIF is over 9 MB. Try a smaller one.");

  const bitmap = await createImageBitmap(file);
  try {
    await assertMadeByHumans(file, bitmap);
  } catch (error) {
    bitmap.close();
    throw error;
  }
  const original = { width: bitmap.width, height: bitmap.height };
  // GIFs go up whole (see above), so they're never cropped.
  const area = crop && !gif ? clampCrop(crop, original) : { x: 0, y: 0, ...original };
  const scale = Math.min(1, maxDimension / Math.max(area.width, area.height));
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    // The default ("low") shrinks big canvases with visible aliasing.
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, width, height);
  }

  const sampleScale = Math.min(1, SAMPLE_SIZE / Math.max(width, height));
  const sample = document.createElement("canvas");
  sample.width = Math.max(1, Math.round(width * sampleScale));
  sample.height = Math.max(1, Math.round(height * sampleScale));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  sampleContext?.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, sample.width, sample.height);
  bitmap.close();

  const rgba = sampleContext?.getImageData(0, 0, sample.width, sample.height).data ?? new Uint8ClampedArray();
  const rgb = new Uint8Array((rgba.length / 4) * 3);
  const alpha = new Uint8Array(rgba.length / 4);
  let transparent = false;
  for (let i = 0, j = 0, k = 0; i < rgba.length; i += 4, j += 3, k++) {
    [rgb[j], rgb[j + 1], rgb[j + 2]] = [rgba[i], rgba[i + 1], rgba[i + 2]];
    alpha[k] = rgba[i + 3];
    if (rgba[i + 3] < 250) transparent = true;
  }
  const palette = rgb.length ? extractPalette(rgb, sample.width, sample.height, transparent ? alpha : undefined) : [];
  const thumb = wantThumb && (gif || Math.max(width, height) > THUMB_MAX) ? await makeThumb(canvas, transparent, allowPng) : undefined;

  if (gif) {
    // Uploaded whole (see above), minus its comments and XMP.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (formatOf(bytes) !== "gif") throw new Error("That file isn't really a GIF. Pick a PNG, JPG, WebP or GIF.");
    const stripped = stripMetadata(bytes);
    const blob = stripped ? new Blob([stripped as BlobPart], { type: "image/gif" }) : file;
    const { width: w, height: h } = original;
    return { blob, type: "image/gif", width: w, height: h, previewUrl: URL.createObjectURL(blob), palette, thumb };
  }

  const kept = wantOriginal ? await keepOriginal(file, original) : undefined;
  const done = (blob: Blob, type: PreparedImage["type"]): PreparedImage => ({
    blob,
    type,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
    palette,
    thumb,
    original: kept,
  });

  if (allowPng && Math.max(width, height) <= LOSSLESS_MAX_SIDE) {
    const png = await toBlob(canvas, "image/png", 1);
    if (png && png.size <= MAX_BYTES) return done(png, "image/png");
  }

  for (const quality of [0.9, 0.82, 0.72, 0.6]) {
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp?.type === "image/webp") {
      if (webp.size <= MAX_BYTES) return done(webp, "image/webp");
      continue;
    }
    // This browser can't encode WebP (it hands back PNG). JPEG has no
    // transparency, so see-through images stay PNG where allowed.
    if (transparent && allowPng && webp && webp.size <= MAX_BYTES) return done(webp, "image/png");
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    if (jpeg && jpeg.size <= MAX_BYTES) return done(jpeg, "image/jpeg");
  }
  throw new Error("That image is too large. Try a smaller one.");
}

/** The display canvas scaled down to THUMB_MAX: WebP, or PNG / JPEG where the browser can't encode WebP. */
async function makeThumb(source: HTMLCanvasElement, transparent: boolean, allowPng: boolean) {
  const scale = Math.min(1, THUMB_MAX / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  let blob = await toBlob(canvas, "image/webp", 0.82);
  if (blob && blob.type !== "image/webp") blob = transparent && allowPng ? blob : await toBlob(canvas, "image/jpeg", 0.82);
  const type = blob?.type;
  if (!blob || (type !== "image/webp" && type !== "image/jpeg" && type !== "image/png")) return undefined;
  return { blob, type, width: canvas.width, height: canvas.height } satisfies ThumbInfo & { blob: Blob };
}

/**
 * The file itself, metadata stripped. Its type comes from its bytes, not its
 * name. Skipped (the display copy still goes up) for formats we don't keep
 * (HEIC, AVIF…) and files over 25 MB.
 */
async function keepOriginal(file: File, size: { width: number; height: number }) {
  if (file.size > ORIGINAL_MAX_BYTES * 1.2) return undefined;
  const stripped = stripMetadata(new Uint8Array(await file.arrayBuffer()));
  const info = stripped && readImageInfo(stripped);
  if (!stripped || !info || info.format === "gif" || stripped.length > ORIGINAL_MAX_BYTES) return undefined;
  // A PNG or WebP turned by EXIF would come out sideways without it: keep only the display copy then.
  if (info.width !== size.width || info.height !== size.height) return undefined;
  const type = MIME_TYPE[info.format] as OriginalInfo["type"];
  return {
    blob: new Blob([stripped as BlobPart], { type }),
    type,
    width: size.width,
    height: size.height,
    bytes: stripped.length,
  } satisfies OriginalInfo & { blob: Blob };
}

/** Keeps a crop inside the image, in whole pixels. */
function clampCrop(crop: CropRect, image: { width: number; height: number }): CropRect {
  const x = Math.min(Math.max(0, Math.round(crop.x)), image.width - 1);
  const y = Math.min(Math.max(0, Math.round(crop.y)), image.height - 1);
  return {
    x,
    y,
    width: Math.max(1, Math.min(Math.round(crop.width), image.width - x)),
    height: Math.max(1, Math.min(Math.round(crop.height), image.height - y)),
  };
}

/**
 * Uploads straight to storage (no server hop, so no request-size limit): the
 * display copy, then its thumb and original beside it. Returns what to save
 * with the row; a thumb or original that didn't make it is left out (the
 * display copy stands in for it).
 */
export async function uploadArt(image: PreparedImage, folder: ArtFolder): Promise<StoredImage> {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Your session expired. Sign in again to upload.");

  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif" }[image.type];
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const put = (bucket: string, at: string, blob: Blob, type: string) =>
    supabase.storage.from(bucket).upload(at, blob, { contentType: type, cacheControl: "31536000", upsert: false });

  const { error } = await put(ART_BUCKET, path, image.blob, image.type);
  // Storage answers a refused row (the limits in the originals migration) with a policy error.
  if (error && /row-level security/i.test(error.message)) {
    throw new Error("You've reached the upload limit: about 200 pictures a day, and 5 GB in all (50 GB with Flow+).");
  }
  if (error) throw new Error("Upload failed. Check your connection and try again.");

  const { thumb, original } = image;
  const [thumbDone, originalDone] = await Promise.all([
    thumb && put(ART_BUCKET, thumbPathOf(path, thumb), thumb.blob, thumb.type),
    original && put(ORIGINALS_BUCKET, originalPathOf(path, original), original.blob, original.type),
  ]);
  return {
    path,
    width: image.width,
    height: image.height,
    palette: image.palette,
    ...(thumb && thumbDone && !thumbDone.error && { thumb: { width: thumb.width, height: thumb.height, type: thumb.type } }),
    ...(original &&
      originalDone &&
      !originalDone.error && {
        original: { width: original.width, height: original.height, type: original.type, bytes: original.bytes },
      }),
  };
}

/** Best-effort cleanup when what the upload was for didn't go through. */
export async function discardArt(image: StoredImage) {
  const supabase = supabaseBrowser();
  const { art, originals } = filesOf([image]);
  await Promise.all([
    supabase.storage.from(ART_BUCKET).remove(art).catch(() => {}),
    originals.length ? supabase.storage.from(ORIGINALS_BUCKET).remove(originals).catch(() => {}) : null,
  ]);
}
