"use client";

import type { ImageLoaderProps } from "next/image";
import { pickVariant } from "./variants";

/** Every `next/image` goes through here (`images.loaderFile` in next.config.ts); see variants.ts. */
export default function artLoader({ src, width }: ImageLoaderProps) {
  return pickVariant(src, width);
}
