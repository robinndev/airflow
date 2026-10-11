"use client";

import { Bookmark } from "lucide-react";
import { useFavorite } from "@/components/favorites/store";

/** Saves a commission service to the viewer's moodboard (/favorites). */
export function SaveButton({ serviceId, title }: { serviceId: string; title: string }) {
  const { saved, toggle } = useFavorite({ kind: "service", id: serviceId, title });
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
      title={saved ? "On your moodboard" : "Save to favorites"}
      onClick={toggle}
      className={`-mt-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-ice ${
        saved ? "text-accent-strong" : "text-muted hover:text-ink"
      }`}
    >
      <Bookmark aria-hidden className={`size-[1.125rem] ${saved ? "animate-pop fill-current" : ""}`} />
    </button>
  );
}
