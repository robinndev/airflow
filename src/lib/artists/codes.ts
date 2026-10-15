/*
 * Artist codes: what they are, what they unlock and how to share them.
 * Anyone can join Artiflow to browse, collect and commission; selling
 * (commission services, adoptables) takes artist access, which comes from a
 * single-use artist code (the `invites` table; granted by the team with
 * `npm run invites`, passed on by the artists who hold them). Modeled on
 * VGen's Artist Invite Codes; the codes page is like Toyhouse's Invitations.
 * Client-safe. The SQL side: supabase/migrations/*_artist_access.sql.
 */

import type { ImageAsset } from "@/lib/profile/types";

/** An artist code someone holds, and who used it. */
export type HeldCode = {
  code: string;
  grantedAt: string;
  usedAt: string | null;
  usedBy: { handle: string; displayName: string; avatar: ImageAsset } | null;
};

/** What an Artist Pass shows (src/components/artists/artist-pass.tsx). */
export type PassData = {
  handle: string;
  name: string;
  avatar: ImageAsset;
  /** Artists are numbered in the order they got in. */
  number?: number;
  since: string;
  invitedBy?: string;
  /** When they reached the goals (verified). */
  verifiedAt?: string;
};

/** The viewer's own pass, and the post that shared it (null: not shared yet). */
export type ViewerPass = PassData & { shared: string | null };

/** The line a new artist's pass is posted with, unless they write their own. */
export const passCaption = (inviter?: string) =>
  inviter ? `I'm officially an Artiflow artist! ✦ Thank you @${inviter} for letting me in.` : "I'm officially an Artiflow artist! ✦";

/** What `redeem_artist_code()` answers. */
export type RedeemOutcome = "ok" | "already" | "unknown" | "used" | "own" | "paused" | "no_profile";

export const REDEEM_ERRORS: Record<Exclude<RedeemOutcome, "ok">, string> = {
  already: "You already have artist access.",
  unknown: "That code doesn't match any artist code. Check it with the artist who gave it to you.",
  used: "That code has already been used. Codes work once: ask for another one.",
  own: "That's one of your own codes. Give it to an artist you trust.",
  paused: "Too many tries. Take a breath and try again in an hour.",
  no_profile: "Finish setting up your account first.",
};

/**
 * Verification: reach both goals and you're a verified artist, with codes to
 * let more artists in. Mirrors `private.verify_goals()` and the 2 codes in
 * `private.check_verification()` (*_verified_artists.sql).
 */
export const VERIFY_GOALS = { followers: 10, salesUsd: 100 } as const;
export const CODES_FOR_VERIFIED = 2;

/** What artist access opens, in the order artists care about. */
export const ARTIST_UNLOCKS = [
  { title: "Take commissions", detail: "Services with packages, slots and your own terms." },
  { title: "Sell adoptables", detail: "Ready-made characters at a fixed price." },
  { title: "The Artist mark", detail: "On your profile, so buyers know you're the real deal." },
  {
    title: "Get verified",
    detail: `${VERIFY_GOALS.followers} followers and $${VERIFY_GOALS.salesUsd} in sales earn the verified mark and ${CODES_FOR_VERIFIED} codes to invite artists.`,
  },
] as const;

/** Where an artist stands on the way to verification. */
export type Progress = { followers: number; salesUsd: number };

/** 0..1 for each goal, and whether both are met. */
export function progressOf({ followers, salesUsd }: Progress) {
  const f = Math.min(1, followers / VERIFY_GOALS.followers);
  const s = Math.min(1, salesUsd / VERIFY_GOALS.salesUsd);
  return { followers: f, sales: s, done: f >= 1 && s >= 1 };
}

/** Why codes at all, in one breath (said on the code sheet). */
export const WHY_CODES =
  "Every artist here was let in by another artist. It keeps bots, AI sellers and scammers out of the marketplace.";

/** How to hand a code on (wording proofread by a native speaker, 2026-10-15). */
export const CODE_RULES = [
  { ok: true, text: "Only give codes to artists you know and trust." },
  { ok: true, text: "Send codes through messages: it helps keep track of them!" },
  { ok: false, text: "Codes cannot be sold or traded. They're free and will stay free." },
  { ok: false, text: "Do not post codes publicly, even if they are partially hidden or obscured." },
  { ok: false, text: "Do not host code giveaways without checking who they are going to." },
] as const;

export const ANSWERABLE =
  "You're responsible for users that you invite to Artiflow and your account may face consequences if they are found to be bad actors.";

/** Said right after ANSWERABLE, so nobody reads it as "any small slip of theirs lands on me". */
export const BAD_ACTORS = "Bad actors may be, but aren't limited to, scammers, AI artists, and art thieves.";

/** The invite link that opens the sign-up with the code already in: `/join?invite=K7QH-3MPA`. */
export const inviteHref = (code: string) => `/join?invite=${encodeURIComponent(code)}`;

/** Codes compare without case, spaces or dashes ("k7qh 3mpa" works). */
export const canonicalCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** As typed → as shown: "k7qh3mpa" → "K7QH-3MPA" (only once it's a full code). */
export function formatCode(raw: string) {
  const plain = canonicalCode(raw).slice(0, 8);
  return plain.length > 4 ? `${plain.slice(0, 4)}-${plain.slice(4)}` : plain;
}

export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

/** "October 2026", for "Artist since …". */
export const sinceMonth = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
