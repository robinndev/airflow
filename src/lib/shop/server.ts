import "server-only";
import { configured } from "@/lib/profile/accounts";
import { createSupabaseServer } from "@/lib/supabase/server";
import { itemKey, isItemKind, pickMonth, type ItemKind, type Owned } from "./catalog";

/*
 * What the signed-in account owns from the shop, read as the user (row level
 * security only shows your own rows), fresh on every call: ownership changes
 * outside any cache tag (claims, monthly picks, future purchases). A
 * database without `owned_items` reads its frames from `owned_frames`.
 */

export type OwnedRow = { kind: ItemKind; id: string; source: string; claimedMonth: string | null };

const MISSING = new Set(["42P01", "PGRST205"]);

export async function fetchOwnedItems(userId: string): Promise<OwnedRow[]> {
  if (!configured()) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("owned_items")
    .select("kind, item_id, source, claimed_month")
    .eq("user_id", userId);
  if (error && MISSING.has(error.code)) {
    const { data: frames } = await supabase.from("owned_frames").select("frame_id, source").eq("user_id", userId);
    return (frames ?? []).map((row) => ({ kind: "frame", id: row.frame_id as string, source: row.source as string, claimedMonth: null }));
  }
  return (data ?? []).flatMap((row) =>
    isItemKind(row.kind) ? [{ kind: row.kind, id: row.item_id as string, source: row.source as string, claimedMonth: row.claimed_month as string | null }] : [],
  );
}

export const ownedSet = (rows: OwnedRow[]): Owned => new Set(rows.map(itemKey));

/** This month's Flow+ pick, if it's been taken. */
export const monthlyPickOf = (rows: OwnedRow[], now: Date) => rows.find((row) => row.claimedMonth === pickMonth(now)) ?? null;
