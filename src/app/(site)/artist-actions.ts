"use server";

import { updateTag } from "next/cache";
import { CODE_PATTERN, canonicalCode, passCaption, REDEEM_ERRORS, type RedeemOutcome, type ViewerPass } from "@/lib/artists/codes";
import { getViewerPass } from "@/lib/artists/server";
import { FEED_TAG, postsTag, profileTag } from "@/lib/profile/queries";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Using an artist code after joining (at sign-up, create_profile does it).
 * Runs as the viewer: `redeem_artist_code()` marks the code used, gives the
 * account artist access, remembers whose code it was (which notifies them)
 * and pauses guessing after ten wrong tries an hour.
 */

export type RedeemResult = { ok: true; inviter: string | null; pass: ViewerPass | null } | { ok: false; error: string; signIn?: true };

export async function redeemArtistCode(code: string): Promise<RedeemResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to use an artist code.", signIn: true };
  const plain = canonicalCode(String(code ?? "").slice(0, 32));
  if (!CODE_PATTERN.test(plain)) return { ok: false, error: REDEEM_ERRORS.unknown };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("redeem_artist_code", { code: plain });
  if (error) return { ok: false, error: "Couldn't check that code. Try again in a moment." };
  const outcome = data as RedeemOutcome;
  if (outcome !== "ok") return { ok: false, error: REDEEM_ERRORS[outcome] ?? REDEEM_ERRORS.unknown };

  const { data: me } = await supabase
    .from("profiles")
    .select("inviter:invited_by(handle)")
    .eq("id", viewer.id)
    .maybeSingle<{ inviter: { handle: string } | null }>();
  const inviter = me?.inviter?.handle ?? null;

  // The welcome that answers this says their 2 new codes are in, so they aren't news for the gift.
  await supabase.rpc("mark_codes_seen");
  const pass = await getViewerPass();

  // Their profile wears the Artist mark now; the inviter's codes page shows the code used.
  updateTag(profileTag(viewer.handle));
  if (inviter) updateTag(profileTag(inviter));
  return { ok: true, inviter, pass };
}

export type ShareResult = { ok: true; href: string } | { ok: false; error: string };

/**
 * Posts the viewer's Artist Pass, once. Written with the secret key (users
 * can't set `milestone`): the server draws the pass from what's true.
 */
export async function shareArtistPass(caption: string): Promise<ShareResult> {
  const pass = await getViewerPass();
  if (!pass) return { ok: false, error: "Only artists have an Artist Pass." };
  if (pass.shared) return { ok: true, href: `/${pass.handle}#${pass.shared}` };
  const body = String(caption ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 2000) || passCaption(pass.invitedBy);

  const { data, error } = await createSupabaseAdmin()
    .from("posts")
    .insert({
      author_id: (await getViewer())!.id,
      kind: "update",
      body,
      milestone: { kind: "artist_pass", number: pass.number ?? null, since: pass.since, invitedBy: pass.invitedBy ?? null },
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, error: "You've already shared your pass." };
  if (error || !data) return { ok: false, error: "Couldn't post your pass. Try again in a moment." };

  updateTag(postsTag(pass.handle));
  updateTag(FEED_TAG);
  return { ok: true, href: `/${pass.handle}#${data.id}` };
}

/** The gift modal was seen: codes granted until now aren't news anymore. */
export async function markCodesSeen(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createSupabaseServer();
  await supabase.rpc("mark_codes_seen");
}
