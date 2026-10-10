export type DownscaledImage = { dataUrl: string; width: number; height: number };

/** Server Actions accept 1 MB bodies by default; leave room for form overhead. */
export const MAX_IMAGE_DATA_URL_LENGTH = 900_000;

/**
 * Resizes and re-encodes an image in the browser before it leaves the device.
 * Interim path until direct-to-storage uploads exist — but resizing client-side
 * stays useful even then (less bandwidth, EXIF metadata stripped by the canvas).
 */
export async function downscaleImage(
  file: File,
  maxDimension: number,
): Promise<DownscaledImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Browsers that can't encode WebP silently return PNG — fall back to JPEG.
  const type = canvas.toDataURL("image/webp", 0.1).startsWith("data:image/webp")
    ? "image/webp"
    : "image/jpeg";

  for (const quality of [0.86, 0.76, 0.64, 0.5]) {
    const dataUrl = canvas.toDataURL(type, quality);
    if (dataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH) {
      return { dataUrl, width, height };
    }
  }
  throw new Error("That image is too large. Try a smaller one.");
}
