"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const HEADER_SENTINEL_ID = "header-sentinel";

/**
 * Headers start transparent, without the bottom border, and turn solid once
 * the page moves under them: overlay headers when a sentinel at the banner's
 * bottom passes under them, the rest as soon as the page scrolls. One
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
  const [solid, setSolid] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const banner = overlay ? document.getElementById(HEADER_SENTINEL_ID) : null;
    const sentinel = banner ?? topRef.current;
    if (!sentinel) return;
    const observer = banner
      ? new IntersectionObserver(
          ([entry]) => setSolid(!entry.isIntersecting && entry.boundingClientRect.top < 64),
          { rootMargin: "-64px 0px 0px 0px" },
        )
      : // The top sentinel has no height; the margin lets the first few pixels of scroll slide by.
        new IntersectionObserver(([entry]) => setSolid(!entry.isIntersecting), {
          rootMargin: "8px 0px 0px 0px",
        });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [overlay]);

  return (
    <>
      {!overlay && <div ref={topRef} aria-hidden />}
      <header
        data-solid={solid}
        className={`group/header sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 data-[solid=false]:border-transparent data-[solid=true]:border-border/80 ${
          frosted ? "data-[solid=true]:bg-surface/65 data-[solid=true]:backdrop-blur-xl" : "data-[solid=true]:bg-surface"
        }`}
      >
        {children}
      </header>
    </>
  );
}
