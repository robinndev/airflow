import { assertMadeByHumans } from "@/lib/ai-check/browser";
import { ART_BUCKET, type ArtFolder } from "@/lib/art-storage";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { SAMPLE_SIZE, extractPalette } from "./extract-palette";

/** The `art` bucket takes files up to 10 MB; stay a little under. */
const MAX_BYTES = 9_500_000;
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
 */
export async function prepareImage(
  file: File,
  maxDimension: number,
  { allowGif = false, allowPng = false, crop }: { allowGif?: boolean; allowPng?: boolean; crop?: CropRect } = {},
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
  canvas.getContext("2d")?.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, width, height);

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

  if (gif) {
    const { width: w, height: h } = original;
    return { blob: file, type: "image/gif", width: w, height: h, previewUrl: URL.createObjectURL(file), palette };
  }

  const done = (blob: Blob, type: PreparedImage["type"]): PreparedImage => ({
    blob,
    type,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
    palette,
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

/** Uploads straight to storage (no server hop, so no request-size limit) and returns the path. */
export async function uploadArt(image: PreparedImage, folder: ArtFolder) {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Your session expired. Sign in again to upload.");

  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif" }[image.type];
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(ART_BUCKET)
    .upload(path, image.blob, { contentType: image.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  return path;
}

/** Best-effort cleanup when what the upload was for didn't go through. */
export async function discardArt(path: string) {
  await supabaseBrowser().storage.from(ART_BUCKET).remove([path]).catch(() => {});
}
