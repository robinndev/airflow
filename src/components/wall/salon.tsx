"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadWallPage } from "@/app/(site)/explore/actions";
import type { WallItem } from "@/lib/wall/query";
import { Tile } from "./tile";
import { Viewer } from "./viewer";

/*
 * The salon wall: justified rows, edge to edge, as many pieces as fit. The
 * first page comes rendered from the server; the next ones load as the end
 * of the wall comes near (one page at a time, no duplicates). The page keys
 * this component by its query, so a new filter starts a new wall.
 */

export function Salon({ initial, more: initialMore, query }: { initial: WallItem[]; more: boolean; query: string }) {
  const [items, setItems] = useState(initial);
  const [more, setMore] = useState(initialMore);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");
  const [open, setOpen] = useState<number | null>(null);
  const busy = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || !more) return;
    busy.current = true;
    setStatus("loading");
    try {
      const page = await loadWallPage(query, items.length);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setMore(page.more);
      setStatus("idle");
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
    }
  }, [items.length, more, query]);

  // Well before the end is on screen; re-armed after each page, so a short page keeps loading.
  useEffect(() => {
    const el = end.current;
    if (!el || !more || status === "failed") return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "1600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, more, status]);

  return (
    <>
      <ul
        aria-label="Art"
        className="salon-rows flex flex-wrap gap-1 after:grow-[999] after:content-[''] sm:gap-1.5"
      >
        {items.map((item, i) => (
          <Tile key={item.id} item={item} onOpen={() => setOpen(i)} priority={i < 10} />
        ))}
      </ul>

      <div ref={end} aria-hidden />
      <div className="mt-10 flex flex-col items-center gap-2 text-center" aria-live="polite">
        {status === "failed" ? (
          <>
            <p className="text-sm text-muted">The next pieces didn&apos;t load.</p>
            <button
              type="button"
              onClick={loadMore}
              className="h-10 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-ink shadow-soft transition-colors hover:border-ocean/40"
            >
              Try again
            </button>
          </>
        ) : more ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={status === "loading"}
            className="h-10 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-ink shadow-soft transition-colors hover:border-ocean/40 disabled:opacity-60"
          >
            {status === "loading" ? "Hanging more…" : "Show more art"}
          </button>
        ) : (
          items.length > 0 && (
            <p className="font-hand text-2xl text-muted">that&apos;s the whole wall, for now ✎</p>
          )
        )}
      </div>

      <Viewer items={items} index={open} onIndex={setOpen} onNearEnd={loadMore} />
    </>
  );
}
