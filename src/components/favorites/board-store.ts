"use client";

import { useSyncExternalStore } from "react";
import type { MoodSlug } from "@/lib/palette";

/*
 * The moodboard's view state: which part of the wall shows (kind and color)
 * and what was just unpinned. A module store rather than context, so the
 * swatch card (its own <Suspense>) can filter the wall by color too.
 */

export type WallShow = "all" | "art" | "posts";

type BoardState = { show: WallShow; mood: MoodSlug | null; hidden: ReadonlySet<string> };

const INITIAL: BoardState = { show: "all", mood: null, hidden: new Set() };
let state = INITIAL;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: Partial<BoardState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function useBoard() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

export const setShow = (show: WallShow) => update({ show });
export const setMood = (mood: MoodSlug | null) => update({ mood });

export function setHidden(key: string, hidden: boolean) {
  const next = new Set(state.hidden);
  if (hidden) next.add(key);
  else next.delete(key);
  update({ hidden: next });
}

/** A fresh visit starts with the whole wall. */
export const resetBoard = () => update(INITIAL);
