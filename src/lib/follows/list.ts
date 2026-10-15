import type { DrawTag } from "@/lib/profile/draws";
import type { ImageAsset, Plan } from "@/lib/profile/types";

/*
 * Followers and following lists (`/[handle]/followers`, `/[handle]/following`).
 * Client-safe: the shapes, the page size and the wording that depends on who
 * is looking. Reads live in server.ts (the `follow_list()` function,
 * *_follow_lists.sql); the viewer's side of each card (do I follow them, do
 * they follow me) comes from the social store in the browser, so the lists
 * stay cached for everyone.
 */

export type FollowList = "followers" | "following";

export const FOLLOW_LISTS: readonly FollowList[] = ["followers", "following"];

/** Cards per page: fills rows of 2, 3 and 4. */
export const FOLLOW_PAGE = 24;

/** Longest search a list takes. */
export const FOLLOW_QUERY_MAX = 40;

export const isFollowList = (value: unknown): value is FollowList => FOLLOW_LISTS.includes(value as FollowList);

/** Someone on a list, as their trading card shows them. */
export type FollowPerson = {
  /** The account's id; a demo artist's made-up one. */
  id: string;
  handle: string;
  displayName: string;
  avatar: ImageAsset;
  banner: ImageAsset;
  plan: Plan;
  /** Artist access (null: a collector), and whether they're verified. */
  artist: { verified: boolean } | null;
  draws: DrawTag[];
  /** When the follow started. */
  followedAt: string;
};

export type FollowPage = { people: FollowPerson[]; total: number };

/** What the follow button on a card says to the viewer. */
export function followLabel({ following, followsYou }: { following: boolean; followsYou: boolean }) {
  if (following) return "Following";
  return followsYou ? "Follow back" : "Follow";
}

/**
 * The filter for people on this list who also follow the viewer, or null
 * where it would mean nothing (everyone on your own followers list does).
 */
export function mutualFilterLabel(list: FollowList, own: boolean): string | null {
  if (!own) return "Also follow you";
  return list === "following" ? "Follow you back" : null;
}

/** Cards say "Follows you", except on your own followers list, where everyone does. */
export const marksFollowsYou = (list: FollowList, own: boolean) => !(own && list === "followers");

/** The line under the list's title. */
export function listBlurb(list: FollowList, { own, name }: { own: boolean; name: string }) {
  if (list === "followers") return own ? "People who follow you." : `People who follow ${name}.`;
  return own ? "People you follow." : `People ${name} follows.`;
}

/** What an empty list says, and to whom. */
export function emptyNote(list: FollowList, { own, name }: { own: boolean; name: string }) {
  if (list === "followers") {
    return own
      ? { title: "No followers yet", body: "Post your work and open your studio: people follow what they love." }
      : { title: "No followers yet", body: `Be the first to follow ${name}.` };
  }
  return own
    ? { title: "Not following anyone yet", body: "Find artists you love on the wall and follow them to see their work first." }
    : { title: "Not following anyone yet", body: `${name} hasn't followed anyone yet.` };
}

/** A search as the list takes it: trimmed, single spaces, a leading @ dropped, capped. */
export function cleanFollowQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().replace(/^@/, "").slice(0, FOLLOW_QUERY_MAX);
}
