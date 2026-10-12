"use server";

import { updateTag } from "next/cache";
import { LISTINGS_TAG, profileTag, servicesTag } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Answering a real commission request (the artist) and taking one back (the
 * buyer). Requests have no write grants: these actions check who's asking,
 * then write with the secret key. Declining or cancelling gives the slot back
 * (a trigger in the listings migration), which can reopen a full service.
 */

export type RequestResult = { ok: true } | { ok: false; error: string };

type Answer = "accept" | "waitlist" | "decline";

const NEXT: Record<Answer, { status: string; from: string[] }> = {
  accept: { status: "accepted", from: ["pending", "waitlisted"] },
  waitlist: { status: "waitlisted", from: ["pending"] },
  decline: { status: "declined", from: ["pending", "waitlisted", "accepted"] },
};

async function refreshArtist(artistId: string) {
  const { data } = await createSupabaseAdmin().from("profiles").select("handle").eq("id", artistId).maybeSingle();
  if (!data) return;
  updateTag(servicesTag(data.handle));
  updateTag(profileTag(data.handle));
  updateTag(LISTINGS_TAG);
  updateTag("explore");
  updateTag("search-index");
}

export async function respondToRequest(id: string, answer: Answer): Promise<RequestResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to answer requests." };
  const next = NEXT[answer];
  if (!next) return { ok: false, error: "Unknown answer." };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("commission_requests")
    .update({ status: next.status })
    .eq("id", id)
    .eq("artist_id", viewer.id)
    .in("status", next.from)
    .select("artist_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't answer that request. Try again in a moment." };
  if (!data) return { ok: false, error: "That request was already answered or withdrawn." };
  await refreshArtist(data.artist_id);
  return { ok: true };
}

export async function cancelRequest(id: string): Promise<RequestResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to manage your requests." };

  const { data, error } = await createSupabaseAdmin()
    .from("commission_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("buyer_id", viewer.id)
    .in("status", ["pending", "waitlisted"])
    .select("artist_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't withdraw that request. Try again in a moment." };
  if (!data) return { ok: false, error: "The artist already answered that request." };
  await refreshArtist(data.artist_id);
  return { ok: true };
}
