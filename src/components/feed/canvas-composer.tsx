"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PostComposer } from "@/components/profile/post-composer";
import type { ImageAsset, PostKind } from "@/lib/profile/types";
import { CanvasCard } from "./canvas-card";

type CanvasComposerProps = { handle: string; displayName: string; avatar: ImageAsset };

function scrollToFeedTop(anchor: HTMLElement | null) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  anchor?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

/**
 * Where the viewer posts. A blank canvas at the top of the feed that opens
 * into the composer (pick a stage to preselect it), and once that scrolls
 * away, a floating Post button that opens the same composer in a dialog.
 */
export function CanvasComposer({ handle, displayName, avatar }: CanvasComposerProps) {
  const [inline, setInline] = useState<PostKind | null>(null);
  const [dialogKind, setDialogKind] = useState<PostKind | null>(null);
  const [docked, setDocked] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstName = displayName.split(" ")[0];

  // The floating button shows up once the canvas has scrolled off the top.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) =>
      setDocked(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inline) anchorRef.current?.querySelector("textarea")?.focus();
  }, [inline]);

  useEffect(() => {
    if (!dialogKind) return;
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector("textarea")?.focus();
  }, [dialogKind]);

  const composer = { handle, displayName, avatar };

  return (
    <>
      <div ref={anchorRef} className="scroll-mt-24">
        {inline ? (
          <div className="relative animate-rise">
            <PostComposer {...composer} initialKind={inline} onPosted={() => setInline(null)} />
            <CloseButton onClick={() => setInline(null)} />
          </div>
        ) : (
          <CanvasCard avatar={avatar} prompt={`What's on your canvas, ${firstName}?`} pick={setInline} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setDialogKind("finished")}
        inert={!docked}
        // Lets other corner widgets (the artist's missions) step up while it's out.
        data-floating-post={docked || undefined}
        className={`fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ocean pr-5 pl-4 text-sm font-bold text-white shadow-lift transition duration-300 ease-out hover:brightness-95 sm:right-6 sm:bottom-6 [&_svg]:size-5 ${
          docked ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <Plus aria-hidden />
        Post
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Create a post"
        onClose={() => setDialogKind(null)}
        onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-scrim/45 backdrop:backdrop-blur-sm open:animate-rise"
      >
        {dialogKind && (
          <div className="relative">
            <PostComposer
              {...composer}
              initialKind={dialogKind}
              onPosted={() => {
                dialogRef.current?.close();
                scrollToFeedTop(anchorRef.current);
              }}
            />
            <CloseButton onClick={() => dialogRef.current?.close()} />
          </div>
        )}
      </dialog>
    </>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close composer"
      className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}
