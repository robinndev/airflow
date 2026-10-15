"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOAST_EVENT, type Toast } from "./toast-events";

/**
 * A paper slip taped to the bottom of the screen: "Saved to favorites · View",
 * or "Unpinned · Undo". Stays while hovered or focused.
 */
export function FavoritesToast() {
  const [toast, setToast] = useState<(Toast & { at: number }) | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onToast = (event: Event) => setToast({ ...(event as CustomEvent<Toast>).detail, at: Date.now() });
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6500 : 4500);
    return () => clearTimeout(timer);
  }, [toast, held]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[5.25rem] z-50 flex justify-center px-4 sm:bottom-6"
    >
      {toast && (
        <div
          key={toast.at}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className="pointer-events-auto relative flex max-w-full animate-rise items-center gap-3 rounded-[4px] bg-paper py-2.5 pr-2.5 pl-5 text-sm text-on-paper shadow-lift -rotate-[0.6deg]"
        >
          <span
            aria-hidden
            className="absolute top-1/2 -left-2.5 h-5 w-7 -translate-y-1/2 -rotate-[8deg] bg-mint/45 [clip-path:polygon(0_8%,100%_0,96%_50%,100%_100%,0_92%,4%_50%)]"
          />
          <span className="min-w-0 line-clamp-2 font-medium">{toast.message}</span>
          {toast.link && (
            <Link
              href={toast.link.href}
              onClick={() => setToast(null)}
              className="shrink-0 rounded-full bg-ocean px-3 py-1 text-[0.8125rem] font-bold text-white transition-[filter] hover:brightness-105"
            >
              {toast.link.label}
            </Link>
          )}
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
              className="shrink-0 rounded-full border border-on-paper/15 px-3 py-1 text-[0.8125rem] font-bold text-on-paper transition-colors hover:bg-on-paper/5"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
