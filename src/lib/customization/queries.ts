import "server-only";
import { fetchOwnedItems } from "@/lib/shop/server";

/**
 * Frames this account owns (the shop's `owned_items`, frames only). Read as
 * the signed-in user, fresh on every call.
 */
export async function fetchOwnedFrames(userId: string): Promise<string[]> {
  return (await fetchOwnedItems(userId)).filter((row) => row.kind === "frame").map((row) => row.id);
}
