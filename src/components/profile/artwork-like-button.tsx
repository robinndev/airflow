"use client";

import { Heart } from "lucide-react";
import { useFavorite } from "@/components/favorites/store";

/** Favorites a gallery piece: it goes on the viewer's moodboard (/favorites). */
export function ArtworkLikeButton({ id, title }: { id: string; title: string }) {
  const { saved, toggle } = useFavorite({ kind: "art", id, title });

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Unfavorite ${title}` : `Favorite ${title}`}
      onClick={toggle}
      className={`absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur-sm transition-[transform,background-color,color] hover:scale-105 hover:bg-surface active:scale-95 ${
        saved ? "text-like" : "text-ink"
      }`}
    >
      <Heart aria-hidden className={`size-[1.125rem] ${saved ? "animate-pop fill-current" : ""}`} />
    </button>
  );
}
