"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LoaderCircle, Repeat2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { repostPost } from "@/app/(site)/[handle]/actions";
import { currentArtist } from "@/app/(site)/comment-actions";
import { HandNote, Tape } from "@/components/explore/doodles";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import type { PostAuthor } from "@/lib/profile/types";
import { OPEN_REPOST_EVENT, type RepostTarget } from "./events";

const MAX_NOTE = 2000;

/**
 * Pin someone's post to your studio, with an optional note. It shows up as a
 * polaroid of the original (see PinnedReference in the feed). One per page.
 */
export function RepostDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<RepostTarget | null>(null);
  // undefined = still checking who's signed in.
  const [me, setMe] = useState<PostAuthor | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function onOpen(event: Event) {
      setTarget((event as CustomEvent<RepostTarget>).detail);
      setNote("");
      setError(null);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      setMe(await currentArtist().catch(() => null));
    }
    window.addEventListener(OPEN_REPOST_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_REPOST_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 2600);
    return () => clearTimeout(timer);
  }, [done]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target || pending) return;
    setPending(true);
    setError(null);
    const result = await repostPost(target.postId, note);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dialogRef.current?.close();
    setDone(true);
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="repost-title"
        onClose={() => setTarget(null)}
        onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-scrim/45 backdrop:backdrop-blur-sm open:animate-rise"
      >
        {target && (
          <form
            onSubmit={submit}
            className="grain relative rounded-panel border border-border bg-surface p-5 shadow-lift sm:p-6"
          >
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
            <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Repost</p>
            <h2 id="repost-title" className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
              Pin it to your studio
            </h2>

            <div className="mt-5 grid items-center gap-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <Polaroid target={target} />
              {me === undefined ? (
                <div className="flex justify-center py-8">
                  <LoaderCircle aria-label="Loading" className="size-5 animate-spin text-muted" />
                </div>
              ) : me === null ? (
                <div>
                  <p className="text-[0.9375rem] text-ink">Sign in to repost {target.author.displayName}&apos;s piece to your studio.</p>
                  <Link href="/sign-in" className={buttonClasses({ className: "mt-4" })}>
                    Sign in
                  </Link>
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar image={me.avatar} size={28} className="size-7" />
                    <span className="truncate text-sm font-semibold text-ink">{me.displayName}</span>
                  </div>
                  <label htmlFor="repost-note" className="sr-only">
                    Add a note (optional)
                  </label>
                  <textarea
                    id="repost-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={MAX_NOTE}
                    rows={3}
                    autoFocus
                    placeholder="Add a note (optional) — why does this one stay with you?"
                    className="field-sizing-content mt-2 block max-h-48 min-h-20 w-full resize-none rounded-[14px] border border-border bg-canvas px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/80 focus:border-ocean/50"
                  />
                </div>
              )}
            </div>

            {me && (
              <div className="mt-5 flex items-center gap-3">
                <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-xs text-danger">
                  {error}
                </p>
                <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses({ variant: "ghost" })}>
                  Cancel
                </button>
                <button type="submit" disabled={pending} className={buttonClasses()}>
                  {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Repeat2 aria-hidden />}
                  {pending ? "Reposting…" : "Repost"}
                </button>
              </div>
            )}
          </form>
        )}
      </dialog>

      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-on-ink shadow-lift transition duration-300 ${
          done ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {done && (
          <>
            <Check aria-hidden className="size-4" />
            Pinned to your studio
          </>
        )}
      </p>
    </>
  );
}

function Polaroid({ target }: { target: RepostTarget }) {
  const { image } = target;
  return (
    <div className="relative mx-auto w-full max-w-[11rem] rotate-[-2.5deg] rounded-[4px] bg-paper p-2 pb-0 shadow-lift">
      <Tape tone="sky" className="-top-3 left-1/2 w-20 -translate-x-1/2 rotate-[3deg]" />
      {image ? (
        <span
          className="relative block overflow-hidden rounded-[2px]"
          style={{ aspectRatio: `${image.width} / ${image.height}`, backgroundColor: image.palette?.[0] }}
        >
          <Image src={image.src} alt={image.alt} fill sizes="176px" className="object-cover" />
        </span>
      ) : (
        <span className="dot-paper block rounded-[2px] p-3 text-[0.8125rem] leading-snug text-on-paper">
          <span className="line-clamp-6">{target.text}</span>
        </span>
      )}
      <span className="flex items-baseline justify-end px-1 pt-1.5 pb-2.5">
        <HandNote tone="paper" className="truncate text-lg">
          @{target.author.handle}
        </HandNote>
      </span>
    </div>
  );
}
