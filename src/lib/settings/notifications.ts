import type { NotificationKind } from "@/lib/notifications/types";

/*
 * Which guest book entries an account can turn off (client-safe). The list
 * matches the check on `account_settings.muted_notifications`; a trigger on
 * `notifications` drops muted kinds before they're written
 * (supabase/migrations/*_account_settings.sql). Commission notices and the
 * studio's own notes stay on: someone is waiting on you, or it's about your
 * account.
 */

export const MUTABLE_KINDS = ["like", "comment", "reply", "mention", "follow", "repost", "invite_joined"] as const;

export type MutableKind = (typeof MUTABLE_KINDS)[number];

export const isMutableKind = (value: unknown): value is MutableKind => MUTABLE_KINDS.includes(value as MutableKind);

type Choice = { kind: MutableKind; label: string; hint: string };

export const NOTICE_GROUPS: { title: string; items: Choice[] }[] = [
  {
    title: "Your posts",
    items: [
      { kind: "like", label: "Likes", hint: "Never signed, just how many: who liked what stays private." },
      { kind: "comment", label: "Comments", hint: "Someone comments on one of your posts." },
      { kind: "repost", label: "Reposts", hint: "Someone shares one of your posts with their followers." },
    ],
  },
  {
    title: "Conversations",
    items: [
      { kind: "reply", label: "Replies", hint: "Someone answers a comment you left." },
      { kind: "mention", label: "Mentions", hint: "Someone writes your @handle in a post or a comment." },
    ],
  },
  {
    title: "People",
    items: [
      { kind: "follow", label: "New followers", hint: "Someone follows you. Following again later never pings twice." },
      { kind: "invite_joined", label: "Artists you let in", hint: "Someone joins with one of your artist codes." },
    ],
  },
];

/** Always written, whatever the settings say. */
export const ALWAYS_ON: { label: string; hint: string; kinds: NotificationKind[] }[] = [
  {
    label: "Commissions",
    hint: "Requests, quotes, cancellations and every step of an order. Someone is waiting on you.",
    kinds: ["commission_request", "request_update"],
  },
  {
    label: "Notes from Artiflow",
    hint: "About your account: the welcome, artist access, codes, getting verified.",
    kinds: ["welcome", "became_artist", "artist_codes", "verified"],
  },
];

/** The muted list as stored: known kinds only, each once, in a stable order. */
export function cleanMuted(values: readonly unknown[]): MutableKind[] {
  const wanted = new Set(values.filter(isMutableKind));
  return MUTABLE_KINDS.filter((kind) => wanted.has(kind));
}
