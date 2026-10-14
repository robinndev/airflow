"use client";

import { useEffect, useState, type RefObject } from "react";

/*
 * GIFs on the wall play only on screen, a few at a time (roadmap: "original
 * images, cheap and safe"): a GIF is the heaviest file there is, and dozens
 * playing at once make phones stutter. Tiles show their still frame until
 * they're mostly on screen; then the first few in reading order play. One
 * shared IntersectionObserver for every GIF tile. With reduced motion, none
 * play by themselves (hovering or focusing a tile still plays it).
 */

const MAX_PLAYING = 6;

const visible = new Set<Element>();
let playing = new Set<Element>();
const listeners = new Set<() => void>();
let observer: IntersectionObserver | null = null;

const inReadingOrder = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

function recompute() {
  const next = new Set([...visible].sort(inReadingOrder).slice(0, MAX_PLAYING));
  if (next.size === playing.size && [...next].every((el) => playing.has(el))) return;
  playing = next;
  for (const listener of listeners) listener();
}

function watch() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      recompute();
    },
    { threshold: 0.5 },
  );
  return observer;
}

/** Whether this GIF tile gets to play now. */
export function useGifTurn(ref: RefObject<Element | null>, enabled: boolean) {
  const [turn, setTurn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const update = () => setTurn(playing.has(el));
    listeners.add(update);
    watch().observe(el);
    return () => {
      observer?.unobserve(el);
      visible.delete(el);
      listeners.delete(update);
      recompute();
      setTurn(false);
    };
  }, [ref, enabled]);

  return turn;
}
