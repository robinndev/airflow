"use client";

import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { formatCompact } from "@/lib/format";

type PostActionsProps = {
  postId: string;
  handle: string;
  likes: number;
  comments: number;
};

// UI-only until reactions are persisted (Phase 2 in the blueprint).
export function PostActions({ postId, handle, likes, comments }: PostActionsProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
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
        onClick={() => setLiked((v) => !v)}
        className={`${action} ${liked ? "text-[#e2457a] hover:text-[#e2457a]" : ""}`}
      >
        <Heart
          aria-hidden
          className={`transition-transform duration-200 ${liked ? "scale-110 fill-current" : ""}`}
        />
        <span className="tabular-nums">{formatCompact(likes + (liked ? 1 : 0))}</span>
      </button>

      <button type="button" aria-label="Comments" className={action}>
        <MessageCircle aria-hidden />
        <span className="tabular-nums">{formatCompact(comments)}</span>
      </button>

      <button type="button" onClick={share} className={action}>
        <Share2 aria-hidden />
        <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
      </button>

      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save"}
        onClick={() => setSaved((v) => !v)}
        className={`${action} ml-auto ${saved ? "text-accent-strong hover:text-accent-strong" : ""}`}
      >
        <Bookmark aria-hidden className={saved ? "fill-current" : ""} />
      </button>
    </footer>
  );
}
