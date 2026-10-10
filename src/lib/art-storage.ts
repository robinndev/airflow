import { SUPABASE_URL } from "@/lib/supabase/env";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * Uploaded art lives in the public `art` bucket, one folder per account:
 * art/<user id>/{posts,avatar,banner,about}/<uuid>.<ext> (about = About board and
 * profile background images). Storage policies only let
 * people write inside their own folder.
 */

export const ART_BUCKET = "art";
export type ArtFolder = "posts" | "avatar" | "banner" | "about";

/** What we store about an uploaded image (`profiles.avatar`, post image columns). */
export type StoredImage = { path: string; width: number; height: number; palette?: string[] | null };

export function artUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${ART_BUCKET}/${path}`;
}

export function toImageAsset(image: StoredImage, alt: string): ImageAsset {
  return { src: artUrl(image.path), alt, width: image.width, height: image.height, palette: image.palette ?? undefined };
}

/** True for a path this user's upload would have produced in that folder. */
export function isOwnArtPath(path: string, userId: string, folder: ArtFolder) {
  const escaped = userId.replace(/[^a-f0-9-]/gi, "");
  return new RegExp(`^${escaped}/${folder}/[0-9a-f-]{36}\\.(webp|jpg|gif)$`).test(path);
}
