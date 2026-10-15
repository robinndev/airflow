"use client";

import { useLayoutEffect } from "react";
import { applyHideLikes } from "@/lib/settings/prefs";

/** Applies the viewer's saved look-and-feel settings to <html> (signed out: the defaults). */
export function ViewerPrefs({ hideLikes }: { hideLikes: boolean }) {
  useLayoutEffect(() => applyHideLikes(hideLikes), [hideLikes]);
  return null;
}
