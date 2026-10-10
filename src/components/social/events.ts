import type { ImageAsset } from "@/lib/profile/types";

/*
 * Any comment or repost button opens the page's single panel / dialog
 * (<CommentsPanel>, <RepostDialog>) through these window events, the same way
 * commission rows open the request dialog (components/commissions/events.ts).
 */

export const OPEN_COMMENTS_EVENT = "social:open-comments";
export const OPEN_REPOST_EVENT = "social:open-repost";

export type CommentsTarget = { postId: string; authorName: string; excerpt: string };

/** What the repost dialog shows of the original: its first image, or its words. */
export type RepostTarget = {
  postId: string;
  author: { handle: string; displayName: string };
  image?: ImageAsset;
  text: string;
};

export function openComments(target: CommentsTarget) {
  window.dispatchEvent(new CustomEvent(OPEN_COMMENTS_EVENT, { detail: target }));
}

export function openRepost(target: RepostTarget) {
  window.dispatchEvent(new CustomEvent(OPEN_REPOST_EVENT, { detail: target }));
}
