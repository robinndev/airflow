"use client";

import { useEffect, useState } from "react";
import { FEED_LIGHT_ID, type LightStop } from "./light";

/**
 * Lights the room with the artwork in view: whichever post crosses the middle
 * of the screen hands its colors to the ambient layer (`#feed-light`), which
 * eases between them in CSS. Also renders the palette rail — the feed's
 * colors as a minimap you can jump around in.
 */
export function FeedLight({ stops }: { stops: LightStop[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = stops.findIndex((s) => s.id === entry.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const stop of stops) {
      const el = document.getElementById(stop.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [stops]);

  useEffect(() => {
    const layer = document.getElementById(FEED_LIGHT_ID);
    const glow = stops[active]?.glow;
    if (!layer || !glow?.length) return;
    ["a", "b", "c"].forEach((slot, i) => layer.style.setProperty(`--light-${slot}`, glow[i % glow.length]));
  }, [active, stops]);

  function jump(id: string) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  if (stops.length < 2) return null;

  return (
    <nav
      aria-label="Jump to a piece by its colors"
      className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 flex-col items-end gap-1.5 xl:flex"
    >
      {stops.map((stop, i) => {
        const current = i === active;
        return (
          <a
            key={stop.id}
            href={`#${stop.id}`}
            onClick={(event) => {
              event.preventDefault();
              jump(stop.id);
            }}
            aria-current={current ? "true" : undefined}
            className="group/stop relative flex items-center py-0.5"
          >
            <span
              className="pointer-events-none absolute right-full mr-3 translate-x-1 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink opacity-0 shadow-soft backdrop-blur-sm transition duration-200 group-hover/stop:translate-x-0 group-hover/stop:opacity-100 group-focus-visible/stop:translate-x-0 group-focus-visible/stop:opacity-100"
            >
              {stop.label}
            </span>
            <span
              aria-hidden
              className={`block rounded-full ring-1 ring-ink/10 transition-[width,height,box-shadow] duration-300 ease-out ${
                current ? "h-12 w-3.5 shadow-lift ring-2 ring-surface" : "h-6 w-2 opacity-70 group-hover/stop:w-3 group-hover/stop:opacity-100"
              }`}
              style={{ backgroundImage: `linear-gradient(${[...stop.swatches, ...stop.swatches].slice(0, 5).join(", ")})` }}
            />
          </a>
        );
      })}
    </nav>
  );
}
