import "server-only";
import { ORIGINALS_BUCKET, artUrl, type StoredImage } from "@/lib/art-storage";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { EXTENSION, formatOfMime } from "./formats";
import { originalPathOf } from "./variants";

/**
 * A link to the file as the artist uploaded it: a signed URL into the private
 * `originals` bucket, or the display copy when there's no original (uploads
 * from before originals were kept, GIFs). Signed with the secret key, so
 * check first that the viewer may have it (the artist, or the buyer of a
 * delivered commission). `download` names the file for "Save as".
 */
export async function originalUrl(image: StoredImage, { download, seconds = 60 * 60 }: { download?: string; seconds?: number } = {}) {
  if (!image.original) return artUrl(image.path);
  const ext = EXTENSION[formatOfMime(image.original.type) ?? "png"];
  const { data } = await createSupabaseAdmin()
    .storage.from(ORIGINALS_BUCKET)
    .createSignedUrl(originalPathOf(image.path, image.original), seconds, download ? { download: `${download}.${ext}` } : undefined);
  return data?.signedUrl ?? artUrl(image.path);
}
