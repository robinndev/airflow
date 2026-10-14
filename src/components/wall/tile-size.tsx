"use client";

import { Grid2x2, Grid3x3, Square, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

/*
 * How big the wall's tiles are: small (the most art at once), medium, large.
 * A per-browser preference: localStorage, applied to <html> as
 * `data-wall-size` (the `salon-rows` utility reads it). The page's inline
 * script applies it before first paint; the toggle applies it after a
 * client-side navigation, where inline scripts don't run.
 */

type Size = "s" | "m" | "l";

const KEY = "artiflow:wall-size";

export const tileSizeScript = `try{var s=localStorage.getItem(${JSON.stringify(KEY)});if(s==="s"||s==="l")document.documentElement.dataset.wallSize=s}catch(e){}`;

const SIZES: { size: Size; label: string; icon: LucideIcon }[] = [
  { size: "s", label: "Small tiles", icon: Grid3x3 },
  { size: "m", label: "Medium tiles", icon: Grid2x2 },
  { size: "l", label: "Large tiles", icon: Square },
];

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => (listeners.add(listener), () => listeners.delete(listener));
const current = (): Size => {
  const size = document.documentElement.dataset.wallSize;
  return size === "s" || size === "l" ? size : "m";
};

function apply(size: Size) {
  if (size === "m") delete document.documentElement.dataset.wallSize;
  else document.documentElement.dataset.wallSize = size;
  for (const listener of listeners) listener();
}

export function TileSize() {
  const size = useSyncExternalStore(subscribe, current, () => "m" as Size);

  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "s" || saved === "l") apply(saved);
    } catch {
      // Storage blocked: medium it is.
    }
  }, []);

  function choose(next: Size) {
    apply(next);
    try {
      if (next === "m") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice lasts until the page closes.
    }
  }

  return (
    <div role="group" aria-label="Tile size" className="flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5">
      {SIZES.map(({ size: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={size === option}
          aria-label={label}
          title={label}
          onClick={() => choose(option)}
          className="grid size-7 place-items-center rounded-full text-muted transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
        >
          <Icon aria-hidden className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
