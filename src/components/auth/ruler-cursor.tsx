"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the pointer's position on the mat's rulers, like the rulers in a
 * drawing app. Writes CSS variables straight to the DOM (no re-renders) and
 * stays off on touch screens.
 */
export function RulerCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", `${event.clientX}px`);
        el.style.setProperty("--py", `${event.clientY}px`);
        el.dataset.active = "true";
      });
    };
    const leave = () => {
      el.dataset.active = "false";
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} data-active="false" className="absolute inset-0 opacity-0 transition-opacity duration-300 data-[active=true]:opacity-100">
      <span className="absolute top-0 left-(--px) h-7 w-px bg-ocean" />
      <span className="absolute top-[22px] left-(--px) size-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-ocean" />
      <span className="absolute top-(--py) left-0 h-px w-7 bg-ocean" />
      <span className="absolute top-(--py) left-[22px] size-0 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent border-l-ocean" />
    </div>
  );
}
