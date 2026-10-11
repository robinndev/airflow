"use client";

import { Bookmark, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useFavorite } from "@/components/favorites/store";
import { openComments, openRepost, type CommentsTarget, type RepostTarget } from "@/components/social/events";
import { formatCompact } from "@/lib/format";

const DROPS = 10;

/** Paint flicked off the brush in the artwork's own colors. */
function Splat({ colors }: { colors: string[] }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
      {Array.from({ length: DROPS }, (_, i) => {
        const angle = (i / DROPS) * Math.PI * 2 + (i % 2) * 0.3;
        const distance = 20 + (i % 3) * 7;
        const size = 4 + ((i * 7) % 4);
        return (
          <span
            key={i}
            className="absolute animate-splat rounded-full"
            style={
              {
                width: size,
                height: size,
                margin: -size / 2,
                backgroundColor: colors[i % colors.length] ?? "var(--like)",
                "--dx": `${Math.cos(angle) * distance}px`,
                "--dy": `${Math.sin(angle) * distance}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

const pill =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface/70 px-2.5 text-[0.8125rem] font-semibold text-ink backdrop-blur-sm transition-colors hover:border-ink/25 hover:bg-surface [&_svg]:size-4";

// Likes are UI-only until they're persisted; saves (favorites), comments and reposts are real.
export function PostReactions({
  postId,
  handle,
  likes,
  comments,
  reposts = 0,
  colors,
  conversation,
  repost,
  askingForFeedback = false,
}: {
  postId: string;
  handle: string;
  likes: number;
  comments: number;
  reposts?: number;
  /** Palette used for the like splash. */
  colors: string[];
  /** Opens the comments panel on this post. */
  conversation: CommentsTarget;
  /** What reposting pins: this post, or the original when this one is a repost. */
  repost: RepostTarget;
  /** WIPs and sketches invite critique rather than comments. */
  askingForFeedback?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [splashes, setSplashes] = useState(0);
  const { saved, toggle: toggleSaved } = useFavorite({ kind: "post", id: postId });
  const [shared, setShared] = useState(false);

  function toggleLike() {
    setLiked(!liked);
    if (!liked) setSplashes((n) => n + 1);
  }

  async function share() {
    const url = `${window.location.origin}/${handle}#${postId}`;
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        onClick={toggleLike}
        className={`${pill} aria-pressed:border-like/30 aria-pressed:bg-like/10 aria-pressed:text-like`}
      >
        <span className="relative grid place-items-center">
          {/* Re-keyed so the pop replays on every like. */}
          <Heart key={String(liked)} aria-hidden className={liked ? "animate-pop fill-current" : ""} />
          {liked && splashes > 0 && <Splat key={splashes} colors={colors} />}
        </span>
        <span className="tabular-nums">{formatCompact(likes + (liked ? 1 : 0))}</span>
      </button>

      <button type="button" onClick={() => openComments(conversation)} className={pill}>
        <MessageCircle aria-hidden />
        <span className="tabular-nums">{formatCompact(comments)}</span>
        <span className={askingForFeedback ? "" : "sr-only"}>{askingForFeedback ? "· Feedback" : "comments"}</span>
      </button>

      <button
        type="button"
        onClick={() => openRepost(repost)}
        aria-label={reposts ? `Repost (${reposts} so far)` : "Repost"}
        title="Repost to your studio"
        className={pill}
      >
        <Repeat2 aria-hidden />
        {reposts > 0 && <span className="tabular-nums">{formatCompact(reposts)}</span>}
      </button>

      <span className="ml-auto flex">
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          title={saved ? "On your moodboard" : "Save to favorites"}
          onClick={toggleSaved}
          className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface/80 hover:text-ink aria-pressed:text-ocean [&_svg]:size-[1.125rem] aria-pressed:[&_svg]:animate-pop aria-pressed:[&_svg]:fill-current"
        >
          <Bookmark aria-hidden />
        </button>
        <button
          type="button"
          aria-label={shared ? "Link copied" : "Share"}
          title={shared ? "Link copied" : "Share"}
          onClick={share}
          className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface/80 hover:text-ink [&_svg]:size-[1.125rem]"
        >
          <Share aria-hidden />
        </button>
      </span>
    </div>
  );
}
