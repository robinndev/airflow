"use server";

import { z } from "zod";
import { DEMO_ID, favoriteKey, isFavoriteKind, type FavoriteKey, type FavoriteKind } from "@/lib/favorites/keys";
import { fetchFavoriteRefs, isSavable } from "@/lib/favorites/queries";
import { fetchPostInfo, isRealPostId } from "@/lib/profile/conversation";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Saving to the moodboard (/favorites). Rows are written as the viewer under
 * row level security; the save buttons keep a client-side copy of the keys
 * (src/components/favorites/store.ts), so nothing here invalidates a cache.
 */

export type FavoriteResult = { ok: true } | { ok: false; error: string; signIn?: true };

/** Every key the viewer has saved, so save buttons on static pages show their state. */
export async function loadFavoriteKeys(): Promise<FavoriteKey[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  return (await fetchFavoriteRefs(viewer.id)).map((ref) => favoriteKey(ref.kind, ref.id));
}

const UNIQUE_VIOLATION = "23505";

/**
 * Saves or removes one thing. `savedAt` puts a favorite back where it was
 * (Undo on the moodboard).
 */
export async function setFavorite(
  kind: FavoriteKind,
  id: string,
  saved: boolean,
  savedAt?: string,
): Promise<FavoriteResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to keep a moodboard.", signIn: true };
  if (!isFavoriteKind(kind) || typeof id !== "string" || !(isRealPostId(id) || DEMO_ID.test(id))) {
    return { ok: false, error: "That can't be saved." };
  }
  const target = kind === "post" && isRealPostId(id) ? { post_id: id } : { demo_id: id };
  const supabase = await createSupabaseServer();

  if (!saved) {
    const [column, value] = Object.entries(target)[0];
    const { error } = await supabase.from("favorites").delete().eq("user_id", viewer.id).eq("kind", kind).eq(column, value);
    return error ? { ok: false, error: "Couldn't remove it. Try again in a moment." } : { ok: true };
  }

  const exists = (await isSavable(kind, id)) && (kind !== "post" || !isRealPostId(id) || (await fetchPostInfo(id)) !== null);
  if (!exists) return { ok: false, error: "That isn't there anymore." };
  const when = z.iso.datetime({ offset: true }).safeParse(savedAt);

  const { error } = await supabase
    .from("favorites")
    .insert({ kind, ...target, ...(when.success && { created_at: when.data }) });
  // Already saved (another tab, a double click): that's the outcome we wanted.
  if (error && error.code !== UNIQUE_VIOLATION) {
    return { ok: false, error: "Couldn't save it. Try again in a moment." };
  }
  return { ok: true };
}
