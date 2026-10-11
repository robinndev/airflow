"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scrolls the line sideways when it holds more than fits. The ends fade where
 * there's more to see, and arrows (mouse and trackpad users) slide it along.
 */
export function LineScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setMore({ before: el.scrollLeft > 4, after: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  const slide = (direction: 1 | -1) =>
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });

  const fade = `linear-gradient(to right, ${more.before ? "transparent, black 3rem" : "black"}, ${more.after ? "black calc(100% - 3rem), transparent" : "black"})`;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="-mx-4 overflow-x-auto px-4 pb-8 [scrollbar-width:none] sm:-mx-6 sm:px-6"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {children}
      </div>
      {(["before", "after"] as const).map((side) =>
        more[side] ? (
          <button
            key={side}
            type="button"
            aria-label={side === "before" ? "Back along the line" : "Further along the line"}
            onClick={() => slide(side === "before" ? -1 : 1)}
            className={`absolute top-1/2 z-30 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-on-paper shadow-lift ring-1 ring-on-paper/10 transition-transform hover:scale-105 active:scale-95 sm:grid pointer-coarse:hidden ${
              side === "before" ? "-left-2 lg:-left-5" : "-right-2 lg:-right-5"
            }`}
          >
            {side === "before" ? <ChevronLeft aria-hidden className="size-5" /> : <ChevronRight aria-hidden className="size-5" />}
          </button>
        ) : null,
      )}
    </div>
  );
}
