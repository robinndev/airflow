"use client";

import type { ReactNode } from "react";
import { openComments, type CommentsTarget } from "./events";

/** Opens the page's comments panel on this post. Style it like any button. */
export function CommentsButton({
  target,
  className,
  label,
  children,
}: {
  target: CommentsTarget;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={() => openComments(target)} className={className}>
      {children}
    </button>
  );
}
