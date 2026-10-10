import "server-only";
import { configured } from "@/lib/profile/accounts";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Frames this account owns. Read as the signed-in user (row level security
 * only shows your own rows), fresh on every call: ownership changes outside
 * any cache tag (claims, future purchases).
 */
export async function fetchOwnedFrames(userId: string): Promise<string[]> {
  if (!configured()) return [];
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("owned_frames").select("frame_id").eq("user_id", userId);
  return (data ?? []).map((row) => row.frame_id as string);
}
