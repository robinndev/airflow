"use client";

import { useEffect } from "react";
import { syncViewer } from "./store";

/** Rendered by the header: tells the follow and like buttons who's signed in (null = visitor). */
export function SocialSession({ viewer }: { viewer: string | null }) {
  useEffect(() => syncViewer(viewer), [viewer]);
  return null;
}
