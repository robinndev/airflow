import { glowOf } from "@/lib/palette";
import { getProfile } from "@/lib/profile/queries";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * Artist codes: random, single-use codes (K7QH-3MPA) the team grants to
 * specific artists (`npm run invites`), who pass them on. Joining with one
 * redeems it, gives the new account artist access (it can sell) and links it
 * to whoever held the code (`profiles.invited_by`). Joining without one is
 * fine: a collector browses and commissions, and can add a code later
 * (`redeem_artist_code`, src/lib/artists/). There are no demo codes: a
 * reusable public code would let anyone sell.
 */

export type Invite = {
  code: string;
  /** A personal note from the inviter (none yet: the grant note is internal). */
  note: string | null;
  inviter: { handle: string; displayName: string; avatar: ImageAsset };
  /** The inviter's colors, to light the desk with (see `glowOf`). */
  glow: string[];
};

/** Codes compare without case, spaces or dashes ("mira 7q2k" works). */
export const canonicalCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const INVITE_ERRORS = {
  unknown: "That code doesn't match any artist code. Double-check it with the artist who sent it.",
  used: "That code has already been used. Codes work once: ask the artist for another one.",
} as const;

export type InviteLookup = { ok: true; invite: Invite } | { ok: false; reason: keyof typeof INVITE_ERRORS };

export async function lookupInvite(code: string): Promise<InviteLookup> {
  const wanted = canonicalCode(code);
  if (!wanted) return { ok: false, reason: "unknown" };

  // Invite rows aren't readable by visitors (codes would be enumerable), so look them up here.
  const { data, error } = await createSupabaseAdmin()
    .from("invites")
    .select("code, redeemed_at, inviter:profiles!invites_inviter_id_fkey(handle)")
    .eq("canonical", wanted)
    .maybeSingle<{ code: string; redeemed_at: string | null; inviter: { handle: string } | null }>();
  if (error) throw new Error(`Couldn't check that invite: ${error.message}`);
  if (!data?.inviter) return { ok: false, reason: "unknown" };
  if (data.redeemed_at) return { ok: false, reason: "used" };
  const profile = await getProfile(data.inviter.handle);
  // The grant note is internal, so real invites carry no note.
  return profile ? { ok: true, invite: toInvite(data.code, null, profile) } : { ok: false, reason: "unknown" };
}

function toInvite(
  code: string,
  note: string | null,
  profile: { handle: string; displayName: string; avatar: ImageAsset },
): Invite {
  return {
    code,
    note,
    inviter: { handle: profile.handle, displayName: profile.displayName, avatar: profile.avatar },
    glow: glowOf(profile.avatar.palette),
  };
}
