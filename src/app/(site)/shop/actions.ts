"use server";

import { updateTag } from "next/cache";
import { customizationSchema } from "@/lib/customization/model";
import { fetchPlanForUser } from "@/lib/profile/accounts";
import { profileTag } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { KINDS, WORN_FIELD, isItemKind, itemKey, itemOf, pickMonth, type ItemKind } from "@/lib/shop/catalog";
import { fetchOwnedItems, monthlyPickOf, ownedSet } from "@/lib/shop/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * The supply shop's actions. `owned_items` and `profiles.customization` have
 * no grants for users, so this file (and the customizer's save) is the only
 * way in: it checks the session, the catalog and ownership, then writes with
 * the secret key for exactly this user's rows. No checkout yet: free items
 * are claimed, and Flow+ members take one paid item a month.
 */

export type ShopResult = { ok: true } | { ok: false; error: string };

const UNIQUE = "23505";
const PENDING = "The shop isn't switched on for this database yet (pending migration).";

async function claim(userId: string, kind: ItemKind, id: string, source: "claim" | "monthly", month?: string) {
  const { error } = await createSupabaseAdmin()
    .from("owned_items")
    .insert({ user_id: userId, kind, item_id: id, source, claimed_month: month ?? null });
  if (!error) return null;
  if (error.code === UNIQUE) return source === "monthly" ? "already-picked" : null;
  if (error.code === "42P01" || error.code === "PGRST205") return PENDING;
  return "Couldn't add it. Try again in a moment.";
}

/** Free items: yours to keep (sticker packs land on your board's sticker shelf). */
export async function claimFreeItem(kind: unknown, id: unknown): Promise<ShopResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to collect supplies." };
  const item = isItemKind(kind) && typeof id === "string" ? itemOf(kind, id) : undefined;
  if (!item) return { ok: false, error: "That isn't on the shelves anymore." };
  if (item.priceUsd > 0) return { ok: false, error: "Checkout opens soon." };
  const problem = await claim(viewer.id, item.kind, item.id, "claim");
  return problem ? { ok: false, error: problem } : { ok: true };
}

/** Puts an owned (or free) item on your profile, or takes that kind off with null. */
export async function wearItem(kind: unknown, id: unknown): Promise<ShopResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to wear supplies." };
  if (!isItemKind(kind) || kind === "stickers") return { ok: false, error: "That can't be worn." };

  if (id !== null) {
    const item = typeof id === "string" ? itemOf(kind, id) : undefined;
    if (!item) return { ok: false, error: "That isn't on the shelves anymore." };
    const owned = ownedSet(await fetchOwnedItems(viewer.id));
    if (!owned.has(itemKey(item))) {
      if (item.priceUsd > 0) return { ok: false, error: "Get it first: checkout opens soon." };
      const problem = await claim(viewer.id, item.kind, item.id, "claim");
      if (problem) return { ok: false, error: problem };
    }
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("customization").eq("id", viewer.id).single();
  const current = customizationSchema.safeParse(data?.customization ?? {});
  const next = { ...(current.success ? current.data : customizationSchema.parse({})), [WORN_FIELD[kind]]: (id as string | null) ?? undefined };
  const { error } = await admin.from("profiles").update({ customization: next }).eq("id", viewer.id);
  if (error) return { ok: false, error: `Couldn't put that on. Try again.` };

  updateTag(profileTag(viewer.handle));
  return { ok: true };
}

/** Flow+: one paid item a month, on the house. Worn right away when it's wearable. */
export async function claimMonthlyPick(kind: unknown, id: unknown): Promise<ShopResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in first." };
  if ((await fetchPlanForUser(viewer.id)) !== "flow_plus") return { ok: false, error: "The monthly pick comes with Flow+." };
  const item = isItemKind(kind) && typeof id === "string" ? itemOf(kind, id) : undefined;
  if (!item) return { ok: false, error: "That isn't on the shelves anymore." };
  if (item.priceUsd === 0) return { ok: false, error: "That one's free already: save your pick for a paid one." };

  const rows = await fetchOwnedItems(viewer.id);
  if (ownedSet(rows).has(itemKey(item))) return { ok: false, error: "You already have it." };
  const now = new Date();
  if (monthlyPickOf(rows, now)) return { ok: false, error: "You've taken this month's pick. A new one comes on the 1st." };

  const problem = await claim(viewer.id, item.kind, item.id, "monthly", pickMonth(now));
  if (problem === "already-picked") return { ok: false, error: "You've taken this month's pick. A new one comes on the 1st." };
  if (problem) return { ok: false, error: problem };
  return KINDS[item.kind].worn ? wearItem(item.kind, item.id) : { ok: true };
}
