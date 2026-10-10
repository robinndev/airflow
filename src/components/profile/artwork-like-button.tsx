"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

// UI-only until favorites are persisted (Phase 2 in the blueprint).
export function ArtworkLikeButton({ title }: { title: string }) {
  const [liked, setLiked] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Unfavorite ${title}` : `Favorite ${title}`}
      onClick={() => setLiked((v) => !v)}
      className={`absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur-sm transition-[transform,background-color,color] hover:scale-105 hover:bg-surface active:scale-95 ${
        liked ? "text-like" : "text-ink"
      }`}
    >
      <Heart aria-hidden className={`size-[1.125rem] ${liked ? "fill-current" : ""}`} />
    </button>
  );
}
