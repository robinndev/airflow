"use client";

import { useState, type ReactNode } from "react";
import type { ArtworkKind } from "@/lib/profile/types";

type Filter = "all" | ArtworkKind;

const LABELS: Record<Filter, string> = {
  all: "All",
  commission: "Commissions",
  personal: "Personal",
  adoptable: "Adoptables",
};

/**
 * Filters by flipping a data attribute; cards hide themselves with CSS, so the
 * server-rendered grid never re-renders or refetches.
 */
export function GalleryFilter({
  counts,
  children,
}: {
  counts: Record<Filter, number>;
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const options = (Object.keys(LABELS) as Filter[]).filter(
    (key) => key === "all" || counts[key] > 0,
  );

  return (
    <div data-filter={filter} className="group/gallery">
      <div
        role="group"
        aria-label="Filter artworks"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {options.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-ink text-on-ink"
                  : "border border-border bg-surface text-ink hover:bg-ice"
              }`}
            >
              {LABELS[key]}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active ? "bg-on-ink/15 text-on-ink" : "bg-ice text-muted"
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
