"use client";

import Link from "next/link";
import { ArrowRightLeft, ArrowUpRight, Ellipsis, LoaderCircle, Pencil, Star, Trash2, X } from "lucide-react";
import { useId, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { deleteArtwork, moveToSection, removeFrom, setCover } from "@/app/(site)/[handle]/gallery/actions";
import { useViewerId } from "@/components/favorites/store";
import { showToast } from "@/components/favorites/toast-events";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { CHARACTER_SECTIONS, type CharacterSection, type Piece } from "@/lib/gallery/types";
import { NewCharacterFolder } from "../character-folder";
import { NewCollectionStack } from "../collection-stack";
import { PieceWall, type PieceLabel } from "../piece-wall";
import { AddArtDialog } from "./add-art-dialog";
import { CharacterDialog } from "./character-dialog";
import { CollectionDialog } from "./collection-dialog";
import { PieceDialog } from "./piece-dialog";
import { closeGalleryDialog, openGalleryDialog, useGalleryDialog, type GalleryDialog } from "./store";

/*
 * The owner's side of the gallery. Pages stay static: these islands ask the
 * header who's signed in (useViewerId) and show the owner's buttons, menus
 * and dialogs only when it's the gallery's artist. The Server Actions check
 * ownership again.
 */

export function useIsOwner(ownerId: string) {
  return useViewerId() === ownerId;
}

/** Renders its children only for the gallery's artist. */
export function OwnerOnly({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  return useIsOwner(ownerId) ? <>{children}</> : null;
}

/** Renders its children when `always` is true, or for the gallery's artist (e.g. an empty shelf only they need). */
export function ShowFor({ ownerId, always, children }: { ownerId: string; always: boolean; children: ReactNode }) {
  const owner = useIsOwner(ownerId);
  return always || owner ? <>{children}</> : null;
}

/** A button that opens one of the gallery's dialogs (owner only). */
export function OwnerButton({
  ownerId,
  dialog,
  className,
  children,
}: {
  ownerId: string;
  dialog: Exclude<GalleryDialog, null>;
  className?: string;
  children: ReactNode;
}) {
  if (!useIsOwner(ownerId)) return null;
  return (
    <button type="button" onClick={() => openGalleryDialog(dialog)} className={className}>
      {children}
    </button>
  );
}

/** The owner's empty folder at the end of the shelf. */
export function NewCharacterSlot({ ownerId }: { ownerId: string }) {
  if (!useIsOwner(ownerId)) return null;
  return <NewCharacterFolder onClick={() => openGalleryDialog({ type: "character", characterId: null })} />;
}

export function NewCollectionSlot({ ownerId }: { ownerId: string }) {
  if (!useIsOwner(ownerId)) return null;
  return <NewCollectionStack onClick={() => openGalleryDialog({ type: "collection", collectionId: null })} />;
}

/** The dialog that's open, if any. Mount once per page. */
export function GalleryDialogs({ index }: { index: GalleryIndex }) {
  const dialog = useGalleryDialog();
  const owner = useIsOwner(index.ownerId);
  if (!owner) return null;
  return (
    <>
      <AddArtDialog index={index} open={dialog?.type === "add-art"} preset={dialog?.type === "add-art" ? dialog.placement : undefined} onClose={closeGalleryDialog} />
      {dialog?.type === "piece" && <PieceDialog index={index} pieceId={dialog.pieceId} onClose={closeGalleryDialog} />}
      {dialog?.type === "character" && <CharacterDialog index={index} characterId={dialog.characterId} onClose={closeGalleryDialog} />}
      {dialog?.type === "collection" && <CollectionDialog index={index} collectionId={dialog.collectionId} onClose={closeGalleryDialog} />}
    </>
  );
}

export type WallContext =
  | { type: "gallery" }
  | { type: "character"; id: string; name: string; coverId?: string; sections: Record<string, CharacterSection> }
  | { type: "collection"; id: string; title: string; coverId?: string };

/** The piece wall, with the owner's "…" menu on each piece. */
export function GalleryWall({
  pieces,
  labels,
  filters,
  index,
  context = { type: "gallery" },
  empty,
  row,
}: {
  pieces: Piece[];
  labels?: Record<string, PieceLabel[]>;
  filters?: boolean;
  index: GalleryIndex;
  context?: WallContext;
  empty?: ReactNode;
  row?: "sm" | "md";
}) {
  const owner = useIsOwner(index.ownerId);
  return (
    <PieceWall
      pieces={pieces}
      labels={labels}
      filters={filters}
      empty={empty}
      row={row}
      menu={owner ? (piece) => <PieceMenu piece={piece} handle={index.handle} context={context} /> : undefined}
    />
  );
}

function PieceMenu({ piece, handle, context }: { piece: Piece; handle: string; context: WallContext }) {
  const menuId = `piece-menu-${useId().replace(/[^\w-]/g, "")}`;
  const [confirming, setConfirming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio.");
      document.getElementById(menuId)?.hidePopover();
      showToast({ message: done });
    });
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-input px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-ice disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";
  const section = context.type === "character" ? context.sections[piece.id] : undefined;

  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        aria-label={`Options for ${piece.title}`}
        onClick={() => {
          setConfirming(false);
          setMoving(false);
          setError(null);
        }}
        className="grid size-8 place-items-center rounded-full bg-paper/90 text-on-paper shadow-soft backdrop-blur-sm transition-[opacity,scale] active:scale-95"
        style={{ anchorName: `--${menuId}` } as CSSProperties}
      >
        <Ellipsis aria-hidden className="size-4" />
      </button>
      <div
        id={menuId}
        popover="auto"
        className="w-60 rounded-card border border-border bg-surface p-1.5 text-ink shadow-lift supports-[position-area:bottom]:m-0 supports-[position-area:bottom]:mt-1 supports-[position-area:bottom]:[position-area:bottom_span-right] supports-[position-area:bottom]:[position-try-fallbacks:flip-block]"
        style={{ positionAnchor: `--${menuId}` } as CSSProperties}
      >
        {confirming ? (
          <div className="p-2">
            <p className="text-sm font-semibold">{piece.post ? `Take “${piece.title}” out of the gallery?` : `Delete “${piece.title}”?`}</p>
            <p className="mt-0.5 text-xs text-muted">
              {piece.post
                ? "It leaves every character and collection. The post stays on your profile."
                : "It leaves every character and collection. This can't be undone."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteArtwork(handle, piece.id), piece.post ? `Took “${piece.title}” out of the gallery` : `Deleted “${piece.title}”`)}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-button bg-danger px-3 text-xs font-semibold text-white disabled:opacity-70 [&_svg]:size-3.5"
              >
                {pending && <LoaderCircle aria-hidden className="animate-spin" />}
                {piece.post ? "Take it out" : "Delete"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="h-8 flex-1 rounded-button border border-border text-xs font-semibold text-ink hover:bg-ice">
                Keep
              </button>
            </div>
          </div>
        ) : moving && context.type === "character" ? (
          <div>
            <p className="px-3 pt-1.5 pb-1 text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase">Move to</p>
            {CHARACTER_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending || s.id === section}
                aria-current={s.id === section || undefined}
                onClick={() => run(() => moveToSection(handle, context.id, piece.id, s.id), `Moved to ${s.label}`)}
                className={`${item} aria-[current]:font-bold aria-[current]:text-ocean`}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              type="button"
              className={item}
              onClick={() => {
                document.getElementById(menuId)?.hidePopover();
                openGalleryDialog({ type: "piece", pieceId: piece.id });
              }}
            >
              <Pencil aria-hidden />
              Edit details & where it shows
            </button>
            {context.type !== "gallery" && context.coverId !== piece.id && (
              <button
                type="button"
                disabled={pending}
                className={item}
                onClick={() => run(() => setCover(handle, context.type, context.id, piece.id), "Cover changed")}
              >
                <Star aria-hidden />
                Make it the cover
              </button>
            )}
            {context.type === "character" && (
              <button type="button" className={item} onClick={() => setMoving(true)}>
                <ArrowRightLeft aria-hidden />
                Move to another section
              </button>
            )}
            {context.type !== "gallery" && (
              <button
                type="button"
                disabled={pending}
                className={item}
                onClick={() =>
                  run(
                    () => removeFrom(handle, context.type, context.id, piece.id),
                    `Taken off ${context.type === "character" ? context.name : `“${context.title}”`}`,
                  )
                }
              >
                <X aria-hidden />
                Take it off {context.type === "character" ? context.name : "this collection"}
              </button>
            )}
            {piece.post && (
              <Link href={piece.post.href} className={item} onClick={() => document.getElementById(menuId)?.hidePopover()}>
                <ArrowUpRight aria-hidden />
                Open the post
              </Link>
            )}
            <button type="button" className={`${item} text-danger hover:bg-danger/8`} onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />
              {piece.post ? "Take it out of the gallery" : "Delete piece"}
            </button>
          </>
        )}
        {pending && !confirming && (
          <p className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted">
            <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            Saving…
          </p>
        )}
        {error && (
          <p role="alert" className="px-3 py-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

