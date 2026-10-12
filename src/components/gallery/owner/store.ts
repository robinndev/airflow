"use client";

import { useSyncExternalStore } from "react";
import type { CharacterSection } from "@/lib/gallery/types";

/*
 * Which gallery dialog is open. Any button on the page (the toolbar, an
 * empty folder, a piece's "…" menu) opens one; <GalleryDialogs> renders it.
 */

export type Placement = { characters: { id: string; section: CharacterSection }[]; collections: string[] };

export type GalleryDialog =
  | { type: "add-art"; placement?: Placement }
  | { type: "piece"; pieceId: string }
  | { type: "character"; characterId: string | null }
  | { type: "collection"; collectionId: string | null }
  | null;

let current: GalleryDialog = null;
const listeners = new Set<() => void>();

export function openGalleryDialog(dialog: GalleryDialog) {
  current = dialog;
  for (const listener of listeners) listener();
}

export const closeGalleryDialog = () => openGalleryDialog(null);

export function useGalleryDialog() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
