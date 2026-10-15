"use client";

import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useEffect } from "react";
import { handleProblem, isReservedHandle } from "@/lib/auth/handles";

/** How long the pointer rests on a link before it counts as intent (a cursor sweeping past doesn't). */
const HOVER_INTENT_MS = 80;
/** A profile fetched this recently is still fresh in the router's cache. */
const FRESH_MS = 60_000;

/**
 * Profiles open without the blank skeleton step: when someone points at,
 * touches or tabs to a link into an artist's profile (any link on the site:
 * names, avatars, cards), the router fetches that profile before the click.
 * A plain <Link> only prefetches the profile route's generic shell (the
 * skeleton), since the artist is only known from the URL; prefetching every
 * visible profile link in full would cost a server render each, so this
 * waits for intent. Links within the profile you're on share its layout
 * already and are left alone.
 */
export function ProfilePrefetch() {
  const router = useRouter();

  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const fetchedAt = new Map<string, number>();
    let pending: { anchor: HTMLAnchorElement; timer: number } | null = null;

    const profilePath = (target: EventTarget | null) => {
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== location.origin || anchor.target === "_blank") return null;
      const handle = decodeURIComponent(anchor.pathname.split("/")[1] ?? "").toLowerCase();
      if (handleProblem(handle) !== null || isReservedHandle(handle)) return null;
      if (location.pathname.split("/")[1]?.toLowerCase() === handle) return null;
      return { anchor, path: anchor.pathname };
    };

    const prefetch = (path: string) => {
      const now = Date.now();
      if (now - (fetchedAt.get(path) ?? 0) < FRESH_MS) return;
      fetchedAt.set(path, now);
      router.prefetch(path, { kind: PrefetchKind.FULL });
    };

    const onPointerOver = (event: PointerEvent) => {
      const link = profilePath(event.target);
      if (!link || pending?.anchor === link.anchor) return;
      if (pending) clearTimeout(pending.timer);
      // Touch has no hover: the tap is the intent.
      if (event.pointerType !== "mouse") return prefetch(link.path);
      pending = { anchor: link.anchor, timer: window.setTimeout(() => prefetch(link.path), HOVER_INTENT_MS) };
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!pending || pending.anchor.contains(event.relatedTarget as Node | null)) return;
      clearTimeout(pending.timer);
      pending = null;
    };
    const onFocusIn = (event: FocusEvent) => {
      const link = profilePath(event.target);
      if (link) prefetch(link.path);
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    return () => {
      if (pending) clearTimeout(pending.timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [router]);

  return null;
}
