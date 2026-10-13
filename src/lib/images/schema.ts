import { z } from "zod";
import { THUMB_MAX } from "./variants.ts";

/*
 * What the browser says it uploaded beside a picture (see variants.ts). Server
 * Actions spread `variantFields` into their image schemas and then check the
 * files themselves with `verifyUploads()` (verify.ts) before saving.
 */

/** Originals: long side and area caps, against "decompression bombs" that freeze whoever opens them. */
export const ORIGINAL_LIMITS = { side: 16_384, pixels: 100_000_000, bytes: 25 * 1024 * 1024 };

const side = (max: number) => z.number().int().min(1).max(max);

export const thumbClaim = z.object({
  width: side(THUMB_MAX),
  height: side(THUMB_MAX),
  type: z.enum(["image/webp", "image/jpeg", "image/png"]),
});

export const originalClaim = z.object({
  width: side(ORIGINAL_LIMITS.side),
  height: side(ORIGINAL_LIMITS.side),
  type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  bytes: z.number().int().min(1).max(ORIGINAL_LIMITS.bytes),
});

export const variantFields = { thumb: thumbClaim.nullish(), original: originalClaim.nullish() };
