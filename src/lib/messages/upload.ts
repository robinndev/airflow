import type { PreparedImage } from "@/lib/images/prepare";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { MESSAGES_BUCKET, type ChatImage, type StoredChatImage } from "./types";

/*
 * Pictures in messages go to the private `messages` bucket, in the
 * conversation's folder: <conversation id>/<sender id>/<uuid>.<ext>. Storage
 * policies let only the two people in the conversation read them.
 */

/** Pictures in messages are resized like posts. */
export const MESSAGE_IMAGE_SIZE = 2400;

export async function uploadMessageImage(image: PreparedImage, conversationId: string): Promise<StoredChatImage> {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Your session expired. Sign in again to send pictures.");

  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/gif": "gif" }[image.type];
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MESSAGES_BUCKET)
    .upload(path, image.blob, { contentType: image.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("A picture didn't upload. Check your connection and try again.");
  return { path, width: image.width, height: image.height };
}

/** Signed links for pictures that arrived live (the two people can read them; links last a day). */
export async function signMessageImages(images: StoredChatImage[]): Promise<ChatImage[]> {
  if (images.length === 0) return [];
  const { data } = await supabaseBrowser()
    .storage.from(MESSAGES_BUCKET)
    .createSignedUrls(
      images.map((image) => image.path),
      60 * 60 * 24,
    );
  const urls = new Map<string, string>();
  for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  return images.flatMap((image) => {
    const url = urls.get(image.path);
    return url ? [{ ...image, url }] : [];
  });
}
