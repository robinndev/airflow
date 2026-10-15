import type { ImageAsset } from "@/lib/profile/types";

/*
 * Notifications as the browser sees them (client-safe). Rows live in
 * `public.notifications`, written only by database triggers (likes,
 * comments, follows, reposts, mentions, invites, commission requests;
 * supabase/migrations/*_notifications*.sql) and shaped here by server.ts.
 * Commission notices are read apart from the rest (see NoticeScope).
 */

export type NotificationKind =
  | "welcome"
  | "like"
  | "comment"
  | "reply"
  | "mention"
  | "follow"
  | "repost"
  | "invite_joined"
  | "commission_request"
  | "request_update"
  /** You got artist access (from someone's artist code, or the team). */
  | "became_artist"
  /** Artist codes arrived to hand on (from the team, or Flow+'s weekly one). */
  | "artist_codes"
  /** You reached the goals (followers, sales): verified, with codes to invite artists. */
  | "verified";

/**
 * Where a notice lands. Commission notices (requests, quotes, answers,
 * cancels, payments, deliveries) are work, so they get the header's order
 * clipboard with a count of their own; everything else is the guest book
 * (the bell and /notifications). The pulse counts the two apart.
 */
export type NoticeScope = "book" | "orders";

export const ORDER_KINDS = ["commission_request", "request_update"] as const satisfies readonly NotificationKind[];

export const scopeOfKind = (kind: string): NoticeScope =>
  (ORDER_KINDS as readonly string[]).includes(kind) ? "orders" : "book";

/** A commission request's state when the notice was written ("accepted" is from before quotes existed). */
export type RequestStatus =
  | "pending"
  | "waitlisted"
  | "declined"
  | "cancelled"
  | "accepted"
  | "quoted"
  | "paid"
  | "in_progress"
  | "delivered"
  | "expired";

export type NoteActor = { handle: string; name: string; avatar: ImageAsset };

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** Who did it. Null for likes (who liked what is private) and the studio's own notes. */
  actor: NoteActor | null;
  /** New likes folded into one notice. */
  tally: number;
  /** The piece it's about: its first line and first image (like stamps take the image's colors). */
  piece?: { excerpt: string; image?: ImageAsset };
  /** What they wrote: a comment, a mention, a repost's note, a request's brief. */
  quote?: string;
  /** `declinedQuote`: the buyer cancelled after the artist's quote (said no to it). */
  commission?: { service: string; status: RequestStatus; estimateUsd?: number; declinedQuote?: boolean };
  /** Artist access and codes: your artist number, how many codes arrived, whether it's Flow+'s weekly one. */
  artist?: { number?: number; codes?: number; weekly?: boolean };
  href: string;
  /** Opens this post's comments on arrival (comments, replies, mentions in comments). */
  thread?: { postId: string; authorName: string; excerpt: string };
  /** Latest activity (ISO); a folded like moves it. */
  at: string;
  unread: boolean;
};

export type NotificationPage = { items: AppNotification[]; more: boolean };

/** The last seven days in numbers (the guest book's tally marks). */
export type WeekTally = { likes: number; comments: number; follows: number; reposts: number };

/** /notifications filters (`?show=`), each a page flag on the guest book. */
export const SHOWS = [
  { id: "all", label: "All", kinds: null },
  { id: "comments", label: "Comments", kinds: ["comment", "reply", "mention"] },
  { id: "likes", label: "Likes", kinds: ["like"] },
  { id: "follows", label: "Follows", kinds: ["follow", "invite_joined"] },
  { id: "reposts", label: "Reposts", kinds: ["repost"] },
] as const satisfies readonly { id: string; label: string; kinds: readonly NotificationKind[] | null }[];

export type Show = (typeof SHOWS)[number]["id"];

export const isShow = (value: unknown): value is Show => SHOWS.some((show) => show.id === value);

export const kindsOf = (show: Show): readonly NotificationKind[] | null =>
  SHOWS.find((entry) => entry.id === show)?.kinds ?? null;

/** The badge: "99+" past that (the pulse stops counting at 100). */
export const badgeCount = (unread: number) => (unread > 99 ? "99+" : String(unread));

/** First line of a post, short enough for one line of a notice. */
export function excerptOf(body: string, max = 80) {
  const line = body.trim().split(/\r?\n/)[0] ?? "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
