"use client";

import { Ellipsis, LoaderCircle, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { deletePost } from "@/app/(site)/[handle]/actions";

/** The "…" menu on your own posts: delete, with a confirm step. */
export function PostOwnerMenu({ postId }: { postId: string }) {
  const menuId = `post-menu-${useId().replace(/[^\w-]/g, "")}`;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deletePost(postId);
      if (!result.ok) setError(result.error);
    });
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-input px-3 py-2 text-left text-sm font-medium transition-colors [&_svg]:size-4";

  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        aria-label="Post options"
        className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
        style={{ anchorName: `--${menuId}` } as React.CSSProperties}
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
      >
        <Ellipsis aria-hidden className="size-5" />
      </button>
      <div
        id={menuId}
        popover="auto"
        // Anchored under the button where supported; elsewhere the popover's default (centered) applies.
        className="w-56 rounded-card border border-border bg-surface p-1.5 text-ink shadow-lift supports-[position-area:bottom]:m-0 supports-[position-area:bottom]:mt-1 supports-[position-area:bottom]:[position-area:bottom_span-left]"
        style={{ positionAnchor: `--${menuId}` } as React.CSSProperties}
      >
        {confirming ? (
          <div className="p-2">
            <p className="text-sm font-semibold">Delete this post?</p>
            <p className="mt-0.5 text-xs text-muted">Its image is deleted too. This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-button bg-danger px-3 text-xs font-semibold text-white disabled:opacity-70 [&_svg]:size-3.5"
              >
                {pending && <LoaderCircle aria-hidden className="animate-spin" />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-8 flex-1 rounded-button border border-border text-xs font-semibold text-ink hover:bg-ice"
              >
                Keep
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={`${item} text-danger hover:bg-danger/8`}>
            <Trash2 aria-hidden />
            Delete post
          </button>
        )}
      </div>
    </>
  );
}
