"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/*
 * The banner's bottom edge registers itself here, so an overlay header that
 * mounted before it (over a profile's skeleton) follows the banner that
 * streams in after it, and the next one after a navigation.
 */
let bannerEdge: HTMLElement | null = null;
const edgeListeners = new Set<() => void>();

function setBannerEdge(element: HTMLElement | null) {
  bannerEdge = element;
  edgeListeners.forEach((listener) => listener());
}

function subscribeBannerEdge(listener: () => void) {
  edgeListeners.add(listener);
  return () => edgeListeners.delete(listener);
}

/** Goes at the bottom of a full-bleed banner: overlay headers turn solid once it passes under them. */
export function HeaderSentinel() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    setBannerEdge(element);
    return () => {
      if (bannerEdge === element) setBannerEdge(null);
    };
  }, []);
  return <div ref={ref} aria-hidden className="absolute inset-x-0 bottom-0 h-px" />;
}

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
  const edge = useSyncExternalStore(subscribeBannerEdge, () => bannerEdge, () => null);

  useEffect(() => {
    const banner = overlay ? edge : null;
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
  }, [overlay, edge]);

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
