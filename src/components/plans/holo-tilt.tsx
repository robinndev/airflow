"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

const MAX_TILT = 9;

/**
 * Turns a card toward the pointer and hands the foil's light to it
 * (`--foil-x/--foil-y`, see the foil utilities in globals.css). Touch and
 * reduced motion keep the card flat; the foil's idle drift still runs.
 */
export function HoloTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(event: PointerEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card || event.pointerType === "touch") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty("--foil-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--foil-y", `${(y * 100).toFixed(1)}%`);
    card.style.setProperty("--tilt-x", `${((0.5 - y) * MAX_TILT * 2).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${((x - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
    card.dataset.active = "";
  }

  function leave() {
    const card = ref.current;
    if (!card) return;
    for (const name of ["--foil-x", "--foil-y", "--tilt-x", "--tilt-y"]) card.style.removeProperty(name);
    delete card.dataset.active;
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`holo-tilt ${className}`}>
      {children}
    </div>
  );
}
