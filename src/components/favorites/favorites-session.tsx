"use client";

import { useEffect } from "react";
import { syncViewer } from "./store";

/** Rendered by the header: tells the save buttons who's signed in (null = visitor). */
export function FavoritesSession({ viewer }: { viewer: string | null }) {
  useEffect(() => syncViewer(viewer), [viewer]);
  return null;
}
