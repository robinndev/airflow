import { ART_BUCKET, type ArtFolder } from "@/lib/art-storage";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { SAMPLE_SIZE, extractPalette } from "./extract-palette";

/** The `art` bucket takes files up to 10 MB; stay a little under. */
const MAX_BYTES = 9_500_000;

export type PreparedImage = {
  blob: Blob;
  type: "image/webp" | "image/jpeg" | "image/gif";
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
 * Gets an image ready to upload, in the browser: resized to `maxDimension`,
 * re-encoded as WebP (JPEG where WebP can't be encoded), which also strips
 * EXIF metadata such as location, and its palette extracted.
 *
 * Animated GIFs (profile picture and cover, Flow+ only) are uploaded as they
 * are: re-encoding through a canvas would freeze them on the first frame.
 */
export async function prepareImage(
  file: File,
  maxDimension: number,
  { allowGif = false }: { allowGif?: boolean } = {},
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const gif = file.type === "image/gif";
  if (gif && !allowGif) throw new Error("Animated GIFs come with Flow+. Pick a PNG, JPG or WebP.");
  if (gif && file.size > MAX_BYTES) throw new Error("That GIF is over 9 MB. Try a smaller one.");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);

  const sampleScale = SAMPLE_SIZE / Math.max(width, height);
  const sample = document.createElement("canvas");
  sample.width = Math.max(1, Math.round(width * sampleScale));
  sample.height = Math.max(1, Math.round(height * sampleScale));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  sampleContext?.drawImage(bitmap, 0, 0, sample.width, sample.height);
  const original = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  const rgba = sampleContext?.getImageData(0, 0, sample.width, sample.height).data ?? new Uint8ClampedArray();
  const rgb = new Uint8Array((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) [rgb[j], rgb[j + 1], rgb[j + 2]] = [rgba[i], rgba[i + 1], rgba[i + 2]];
  const palette = rgb.length ? extractPalette(rgb, sample.width, sample.height) : [];

  if (gif) {
    const { width: w, height: h } = original;
    return { blob: file, type: "image/gif", width: w, height: h, previewUrl: URL.createObjectURL(file), palette };
  }

  for (const quality of [0.9, 0.82, 0.72, 0.6]) {
    const webp = await toBlob(canvas, "image/webp", quality);
    // Browsers that can't encode WebP hand back PNG: use JPEG there.
    const blob = webp?.type === "image/webp" ? webp : await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_BYTES) {
      return {
        blob,
        type: blob.type === "image/webp" ? "image/webp" : "image/jpeg",
        width,
        height,
        previewUrl: URL.createObjectURL(blob),
        palette,
      };
    }
  }
  throw new Error("That image is too large. Try a smaller one.");
}

/** Uploads straight to storage (no server hop, so no request-size limit) and returns the path. */
export async function uploadArt(image: PreparedImage, folder: ArtFolder) {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Your session expired. Sign in again to upload.");

  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/gif": "gif" }[image.type];
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
