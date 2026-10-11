import { findAiSignature, findStealthSignature, STEALTH_BITS, type AiSignature } from "./signature";

/**
 * The AI check for files picked in the browser. Use it wherever people hand us
 * an image, before anything re-encodes it: `assertMadeByHumans(file)` throws
 * an AiImageError that <AiImageDialog> knows how to explain.
 */

/** An image whose file says it was made with generative AI. */
export class AiImageError extends Error {
  readonly signature: AiSignature;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;

  constructor(signature: AiSignature, file: File) {
    super(`This file says it was made with ${signature.generator}. Artiflow is made by humans, so it can't be posted here.`);
    this.name = "AiImageError";
    this.signature = signature;
    this.fileName = file.name;
    this.fileType = file.type;
    this.fileSize = file.size;
  }
}

/** The first columns of the image at full resolution: where stealth settings start. */
function hiddenSettings(bitmap: ImageBitmap) {
  const { width, height } = bitmap;
  const columns = Math.min(width, Math.ceil(STEALTH_BITS / height));
  if (columns * height < STEALTH_BITS) return null;

  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? Object.assign(document.createElement("canvas"), { width: columns, height })
      : new OffscreenCanvas(columns, height);
  const context = canvas.getContext("2d", { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) return null;
  // 1:1 copy: alpha comes back exactly (premultiplying only touches the colors).
  context.drawImage(bitmap, 0, 0, columns, height, 0, 0, columns, height);
  const rgba = context.getImageData(0, 0, columns, height).data;

  const alpha = new Uint8Array(columns * height);
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < height; y++) alpha[x * height + y] = rgba[(y * columns + x) * 4 + 3];
  }
  return findStealthSignature(alpha);
}

/**
 * Looks for an AI generator's marks: the file's metadata first, then settings
 * hidden in the pixels. Pass `decoded` if you already have the bitmap.
 */
export async function checkImageForAi(file: Blob, decoded?: ImageBitmap): Promise<AiSignature | null> {
  const signature = await findAiSignature(new Uint8Array(await file.arrayBuffer()));
  if (signature) return signature;

  const bitmap = decoded ?? (await createImageBitmap(file).catch(() => null));
  if (!bitmap) return null;
  try {
    return hiddenSettings(bitmap);
  } finally {
    if (!decoded) bitmap.close();
  }
}

/** Throws an AiImageError when the file carries an AI generator's marks. */
export async function assertMadeByHumans(file: File, decoded?: ImageBitmap) {
  const signature = await checkImageForAi(file, decoded);
  if (signature) throw new AiImageError(signature, file);
}
