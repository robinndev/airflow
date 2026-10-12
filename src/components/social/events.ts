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

/*
 * Opening a post's comments from another page (a notification about a
 * comment): the target waits here until that page's <CommentsPanel> mounts.
 * Client-side navigation keeps this module, so nothing needs storing.
 */
let pendingComments: CommentsTarget | null = null;
let panelsMounted = 0;

/** Opens the comments once `path` is on screen: right away if it already is. */
export function openCommentsAt(path: string, target: CommentsTarget) {
  if (panelsMounted > 0 && window.location.pathname === path) {
    // After the click's own navigation (a hash change) has settled.
    setTimeout(() => openComments(target), 0);
  } else {
    pendingComments = target;
  }
}

/** For <CommentsPanel>: count it as mounted and hand it a target that was waiting for it. */
export function mountCommentsPanel(): { pending: CommentsTarget | null; unmount: () => void } {
  panelsMounted += 1;
  const pending = pendingComments;
  pendingComments = null;
  return {
    pending,
    unmount: () => {
      panelsMounted -= 1;
    },
  };
}
