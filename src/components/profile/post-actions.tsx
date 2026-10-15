"use client";

import { Bookmark, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { useState } from "react";
import { useFavorite } from "@/components/favorites/store";
import { useLike } from "@/components/social/store";
import { openComments, openRepost, type CommentsTarget, type RepostTarget } from "@/components/social/events";
import { formatCompact } from "@/lib/format";

type PostActionsProps = {
  postId: string;
  handle: string;
  likes: number;
  comments: number;
  reposts?: number;
  conversation: CommentsTarget;
  repost: RepostTarget;
};

export function PostActions({ postId, handle, likes, comments, reposts = 0, conversation, repost }: PostActionsProps) {
  const { liked, count: likeCount, toggle: toggleLike } = useLike(postId, likes);
  const { saved, toggle: toggleSaved } = useFavorite({ kind: "post", id: postId });
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/${handle}#${postId}`;
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const action =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-ice hover:text-ink [&_svg]:size-[1.125rem]";

  return (
    <footer className="flex items-center gap-1 px-3 pt-2 pb-3 sm:px-4">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        onClick={toggleLike}
        className={`${action} ${liked ? "text-like hover:text-like" : ""}`}
      >
        <Heart
          aria-hidden
          className={`transition-transform duration-200 ${liked ? "scale-110 fill-current" : ""}`}
        />
        <span data-like-count className="tabular-nums">{formatCompact(likeCount)}</span>
      </button>

      <button type="button" aria-label={`Comments (${comments})`} onClick={() => openComments(conversation)} className={action}>
        <MessageCircle aria-hidden />
        <span className="tabular-nums">{formatCompact(comments)}</span>
      </button>

      <button type="button" aria-label={`Repost (${reposts})`} onClick={() => openRepost(repost)} className={action}>
        <Repeat2 aria-hidden />
        {reposts > 0 && <span className="tabular-nums">{formatCompact(reposts)}</span>}
      </button>

      <button type="button" onClick={share} className={action}>
        <Share2 aria-hidden />
        <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
      </button>

      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        title={saved ? "On your moodboard" : "Save to favorites"}
        onClick={toggleSaved}
        className={`${action} ml-auto ${saved ? "text-accent-strong hover:text-accent-strong" : ""}`}
      >
        <Bookmark aria-hidden className={saved ? "animate-pop fill-current" : ""} />
      </button>
    </footer>
  );
}
