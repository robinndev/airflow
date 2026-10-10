"use client";

import { Bookmark, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatCompact } from "@/lib/format";

type FeedPostActionsProps = {
  postId: string;
  handle: string;
  likes: number;
  comments: number;
  reposts: number;
};

// UI-only until reactions are persisted (Phase 2 in the blueprint).
export function FeedPostActions({ postId, handle, likes, comments, reposts }: FeedPostActionsProps) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
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
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="-ml-2 mt-2 flex max-w-md items-center justify-between">
      <Action label="Reply" count={comments} hover="hover:text-sky [&:hover_.bubble]:bg-sky/12">
        <MessageCircle aria-hidden />
      </Action>
      <Action
        label={reposted ? "Undo repost" : "Repost"}
        count={reposts + (reposted ? 1 : 0)}
        pressed={reposted}
        onClick={() => setReposted((v) => !v)}
        hover="hover:text-mint-strong [&:hover_.bubble]:bg-mint/15"
        activeClass="text-mint-strong"
      >
        <Repeat2 aria-hidden />
      </Action>
      <Action
        label={liked ? "Unlike" : "Like"}
        count={likes + (liked ? 1 : 0)}
        pressed={liked}
        onClick={() => setLiked((v) => !v)}
        hover="hover:text-like [&:hover_.bubble]:bg-like/10"
        activeClass="text-like [&_svg]:fill-current"
      >
        {/* Re-keyed so the pop replays on every like. */}
        <Heart key={String(liked)} aria-hidden className={liked ? "animate-pop" : ""} />
      </Action>
      <div className="flex items-center">
        <Action
          label={saved ? "Remove from saved" : "Save"}
          pressed={saved}
          onClick={() => setSaved((v) => !v)}
          hover="hover:text-ocean [&:hover_.bubble]:bg-ocean/10"
          activeClass="text-ocean [&_svg]:fill-current"
        >
          <Bookmark aria-hidden />
        </Action>
        <Action
          label={copied ? "Link copied" : "Share"}
          onClick={share}
          hover="hover:text-ocean [&:hover_.bubble]:bg-ocean/10"
          activeClass=""
        >
          <Share aria-hidden />
        </Action>
      </div>
    </div>
  );
}

function Action({
  label,
  count,
  pressed,
  onClick,
  hover,
  activeClass = "",
  children,
}: {
  label: string;
  count?: number;
  pressed?: boolean;
  onClick?: () => void;
  hover: string;
  activeClass?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`group/action flex items-center gap-0.5 text-[0.8125rem] text-muted transition-colors ${hover} ${
        pressed ? activeClass : ""
      }`}
    >
      <span className="bubble grid size-9 place-items-center rounded-full transition-colors [&_svg]:size-[1.125rem]">
        {children}
      </span>
      {count !== undefined && <span className="min-w-6 tabular-nums">{formatCompact(count)}</span>}
    </button>
  );
}
