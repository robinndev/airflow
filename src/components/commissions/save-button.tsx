"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";

// UI-only until wishlists are persisted (Phase 2 in the blueprint).
export function SaveButton({ title }: { title: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => setSaved((v) => !v)}
      className={`-mt-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-ice ${
        saved ? "text-accent-strong" : "text-muted hover:text-ink"
      }`}
    >
      <Bookmark aria-hidden className={`size-[1.125rem] ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
