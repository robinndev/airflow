import { glowOf } from "@/lib/palette";
import { getProfile } from "@/lib/profile/queries";
import { db } from "@/lib/profile/mock-db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * Invites are scarce: random, single-use codes (K7QH-3MPA) the team grants to
 * specific artists (`npm run invites`), who pass them on. Joining with one
 * redeems it and links the new account to whoever held it
 * (`profiles.invited_by`). The demo artists keep reusable demo codes below so
 * the prototype still works. Perks and later distribution are open questions
 * in docs/roadmap.md.
 */

type DemoInvite = { code: string; inviterHandle: string; note: string };

const DEMO_INVITES: DemoInvite[] = [
  { code: "MIRA-7Q2K", inviterHandle: "mira", note: "Bring your OCs — I can't wait to draw them!" },
  { code: "KAI-B4NN", inviterHandle: "kai", note: "Come for the adopts, stay for the weirdos. ♥" },
  { code: "NADIA-1NK5", inviterHandle: "nadiadraws", note: "Night owls welcome. See you in the studio." },
  { code: "PEBB-L3S", inviterHandle: "pebblecat", note: "Pull up a chair, the tea's still warm." },
];

export type Invite = {
  code: string;
  /** A personal note from the inviter (demo invites only, for now). */
  note: string | null;
  inviter: { handle: string; displayName: string; avatar: ImageAsset };
  /** The inviter's colors, to light the desk with (see `glowOf`). */
  glow: string[];
};

/** Codes compare without case, spaces or dashes ("mira 7q2k" works). */
export const canonicalCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const INVITE_ERRORS = {
  unknown: "That code doesn't match any invite. Double-check it with the artist who sent it.",
  used: "That invite has already been used. Ask the artist for another one.",
} as const;

export type InviteLookup = { ok: true; invite: Invite } | { ok: false; reason: keyof typeof INVITE_ERRORS };

export async function lookupInvite(code: string): Promise<InviteLookup> {
  const wanted = canonicalCode(code);
  if (!wanted) return { ok: false, reason: "unknown" };

  const demo = DEMO_INVITES.find((invite) => canonicalCode(invite.code) === wanted);
  const demoProfile = demo && db.profiles.find((p) => p.handle === demo.inviterHandle);
  if (demo && demoProfile) return { ok: true, invite: toInvite(demo.code, demo.note, demoProfile) };

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
