import { glowOf } from "@/lib/palette";
import { db } from "@/lib/profile/mock-db";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * Artist-to-artist invites (mock). Every artist will get a personal code to
 * share; whoever joins with it is linked to them ("Invited by @mira"). Perks,
 * if any, are an open question in docs/roadmap.md.
 */

type InviteRecord = { code: string; inviterHandle: string; note: string };

const INVITES: InviteRecord[] = [
  { code: "MIRA-7Q2K", inviterHandle: "mira", note: "Bring your OCs — I can't wait to draw them!" },
  { code: "KAI-B4NN", inviterHandle: "kai", note: "Come for the adopts, stay for the weirdos. ♥" },
  { code: "NADIA-1NK5", inviterHandle: "nadiadraws", note: "Night owls welcome. See you in the studio." },
  { code: "PEBB-L3S", inviterHandle: "pebblecat", note: "Pull up a chair, the tea's still warm." },
];

export type Invite = {
  code: string;
  note: string;
  inviter: { handle: string; displayName: string; avatar: ImageAsset };
  /** The inviter's colors, to light the desk with (see `glowOf`). */
  glow: string[];
};

/** Codes compare without case, spaces or dashes ("mira 7q2k" works). */
const canonical = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function findInvite(code: string): Promise<Invite | null> {
  const wanted = canonical(code);
  if (!wanted) return null;
  const record = INVITES.find((invite) => canonical(invite.code) === wanted);
  const profile = record && db.profiles.find((p) => p.handle === record.inviterHandle);
  if (!record || !profile) return null;
  return {
    code: record.code,
    note: record.note,
    inviter: { handle: profile.handle, displayName: profile.displayName, avatar: profile.avatar },
    glow: glowOf(profile.avatar.palette),
  };
}
