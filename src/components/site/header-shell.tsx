"use client";

import { useEffect, useState, type ReactNode } from "react";

export const HEADER_SENTINEL_ID = "header-sentinel";

/**
 * Overlay headers float transparently over a full-bleed banner and turn solid
 * once a sentinel at the banner's bottom scrolls under them. One
 * IntersectionObserver, no scroll listeners.
 */
export function HeaderShell({
  overlay,
  frosted = false,
  children,
}: {
  overlay: boolean;
  /** Let the page's own light show through (the feed's ambient color). */
  frosted?: boolean;
  children: ReactNode;
}) {
  const [solid, setSolid] = useState(!overlay);

  useEffect(() => {
    if (!overlay) return;
    const sentinel = document.getElementById(HEADER_SENTINEL_ID);
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting && entry.boundingClientRect.top < 64),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [overlay]);

  return (
    <header
      data-solid={solid}
      className={`group/header sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 data-[solid=false]:border-transparent data-[solid=true]:border-border/80 ${
        frosted ? "data-[solid=true]:bg-surface/65 data-[solid=true]:backdrop-blur-xl" : "data-[solid=true]:bg-surface"
      }`}
    >
      {children}
    </header>
  );
}
