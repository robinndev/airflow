import { SUPABASE_URL } from "@/lib/supabase/env";
import type { ImageAsset } from "@/lib/profile/types";
import { originalPathOf, thumbPathOf, withThumb, type OriginalInfo, type ThumbInfo } from "@/lib/images/variants";

/*
 * Uploaded art lives in the public `art` bucket, one folder per account:
 * art/<user id>/{posts,avatar,banner,about,listings,gallery}/<uuid>.<ext> (about =
 * About board and profile background images; listings = service examples and
 * adoptables; gallery = gallery artworks; deliveries = finished commissions).
 * Storage policies only let
 * people write inside their own folder.
 *
 * Beside each picture: a thumb (`<uuid>.thumb.<ext>`, same folder) and, for
 * art, the original file in the private `originals` bucket at the same path.
 * See src/lib/images/variants.ts.
 */

export const ART_BUCKET = "art";
export const ORIGINALS_BUCKET = "originals";
export type ArtFolder = "posts" | "avatar" | "banner" | "about" | "listings" | "gallery" | "deliveries";

/** What we store about an uploaded image (`profiles.avatar`, post image columns). */
export type StoredImage = {
  path: string;
  width: number;
  height: number;
  palette?: string[] | null;
  /** A smaller copy beside it, for walls and cards. */
  thumb?: ThumbInfo | null;
  /** The file as uploaded (metadata stripped), in the private `originals` bucket. */
  original?: OriginalInfo | null;
};

export function artUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${ART_BUCKET}/${path}`;
}

/**
 * GIF thumbs are still frames, so the loader never swaps them in: a GIF's
 * `src` is always the moving file, and the still rides along as `still` for
 * walls that play GIFs only on screen (Explore).
 */
const isGifPath = (path: string) => path.endsWith(".gif");

export function toImageAsset(image: StoredImage, alt: string): ImageAsset {
  const gif = isGifPath(image.path);
  return {
    src: withThumb(artUrl(image.path), gif ? null : image.thumb),
    alt,
    width: image.width,
    height: image.height,
    palette: image.palette ?? undefined,
    ...(gif && image.thumb && { still: artUrl(thumbPathOf(image.path, image.thumb)) }),
  };
}

/** Every file behind these images, per bucket: what to remove when they go. */
export function filesOf(images: (StoredImage | null | undefined)[]) {
  const art: string[] = [];
  const originals: string[] = [];
  for (const image of images) {
    if (!image?.path) continue;
    art.push(image.path);
    if (image.thumb) art.push(thumbPathOf(image.path, image.thumb));
    if (image.original) originals.push(originalPathOf(image.path, image.original));
  }
  return { art, originals };
}

/** True for a path this user's upload would have produced in that folder. */
export function isOwnArtPath(path: string, userId: string, folder: ArtFolder) {
  const escaped = userId.replace(/[^a-f0-9-]/gi, "");
  return new RegExp(`^${escaped}/${folder}/[0-9a-f-]{36}\\.(webp|jpg|png|gif)$`).test(path);
}
