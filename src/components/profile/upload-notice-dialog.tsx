"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { PLANS, formatPlanPrice } from "@/lib/plans";

export type UploadNotice =
  /** A free account picked an animated GIF: show it moving, explain it's a Flow+ perk. */
  | { kind: "flow-plus"; previewUrl: string }
  | { kind: "error"; message: string };

type Slot = "avatar" | "banner";

const SLOT_NAME: Record<Slot, string> = { avatar: "profile picture", banner: "cover" };

/**
 * Modal for upload problems on the profile picture / cover, so they read as a
 * clear moment instead of a toast floating over the banner. Native <dialog>:
 * focus trap, Esc and the top layer come for free.
 */
export function UploadNoticeDialog({
  notice,
  slot,
  onClose,
  onPickAnother,
}: {
  notice: UploadNotice | null;
  slot: Slot;
  onClose: () => void;
  onPickAnother: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (notice && !dialog?.open) dialog?.showModal();
  }, [notice]);

  const titleId = `upload-notice-${slot}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      className="m-auto w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-panel bg-surface p-0 text-ink shadow-lift outline-none transition-[opacity,scale] duration-200 backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] starting:open:scale-95 starting:open:opacity-0"
    >
      {notice && (
        <div className="relative">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-muted shadow-soft backdrop-blur-sm transition-colors hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>

          {notice.kind === "flow-plus" ? (
            <FlowPlusPreview slot={slot} previewUrl={notice.previewUrl} />
          ) : (
            <div className="grid place-items-center bg-ice pt-10 pb-6">
              <span className="grid size-14 place-items-center rounded-[18px] bg-surface text-danger shadow-soft">
                <ImageOff aria-hidden className="size-6" />
              </span>
            </div>
          )}

          <div className="px-6 pt-5 pb-6 text-center sm:px-8">
            {notice.kind === "flow-plus" ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-lilac to-ocean px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-white">
                  <Sparkles aria-hidden className="size-3" />
                  FLOW+ · {formatPlanPrice(PLANS.flow_plus)}/mo
                </span>
                <h2 id={titleId} className="mt-3 font-display text-xl font-extrabold tracking-tight text-balance">
                  Animated {SLOT_NAME[slot]}s are a Flow+ perk
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">
                  Your GIF looks great moving. Flow+ keeps it that way, plus fully custom profiles. On a free
                  account, pick a still image instead: PNG, JPG or WebP.
                </p>
              </>
            ) : (
              <>
                <h2 id={titleId} className="font-display text-xl font-extrabold tracking-tight text-balance">
                  Couldn&apos;t update your {SLOT_NAME[slot]}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{notice.message}</p>
              </>
            )}

            <div className="mt-6 grid gap-2">
              {notice.kind === "flow-plus" && (
                <Link
                  href="/plans#flow-plus"
                  onClick={() => dialogRef.current?.close()}
                  className={buttonClasses({ size: "lg", className: "w-full" })}
                >
                  See Flow+ — {formatPlanPrice(PLANS.flow_plus)}/month
                </Link>
              )}
              <button
                type="button"
                autoFocus={notice.kind === "error"}
                onClick={() => {
                  dialogRef.current?.close();
                  onPickAnother();
                }}
                className={buttonClasses({
                  variant: notice.kind === "flow-plus" ? "secondary" : "primary",
                  size: "lg",
                  className: "w-full",
                })}
              >
                {notice.kind === "flow-plus" ? "Use a still image instead" : "Try another image"}
              </button>
              {notice.kind === "error" && (
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className={buttonClasses({ variant: "ghost", size: "lg", className: "w-full" })}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** The picked GIF, playing, in the shape it would have taken on the profile. */
function FlowPlusPreview({ slot, previewUrl }: { slot: Slot; previewUrl: string }) {
  return (
    <div className="bg-gradient-to-br from-ice-lilac via-ice to-ice-blue px-6 pt-8 pb-6">
      {slot === "avatar" ? (
        <div className="relative mx-auto size-28 overflow-hidden rounded-full shadow-lift ring-4 ring-surface">
          <Image src={previewUrl} alt="Your animated GIF" fill unoptimized className="object-cover" />
        </div>
      ) : (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-card shadow-lift ring-4 ring-surface">
          <Image src={previewUrl} alt="Your animated GIF" fill unoptimized className="object-cover" />
        </div>
      )}
    </div>
  );
}
