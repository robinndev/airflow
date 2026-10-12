"use client";

import Image from "next/image";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { deleteArtwork, updateArtwork } from "@/app/(site)/[handle]/gallery/actions";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { LIMITS } from "@/lib/gallery/types";
import { ChipInput, fieldLabel, GalleryDialogShell, ink, PlacementPicker } from "./fields";
import type { Placement } from "./store";

/** Edit one piece: its label, and which characters and collections it's on. */
export function PieceDialog({ index, pieceId, onClose }: { index: GalleryIndex; pieceId: string | null; onClose: () => void }) {
  const id = useId();
  const piece = pieceId ? index.pieces[pieceId] : undefined;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"personal" | "commission">("personal");
  const [client, setClient] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [placement, setPlacement] = useState<Placement>({ characters: [], collections: [] });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!piece) return;
    setTitle(piece.title);
    setDescription(piece.description ?? "");
    setKind(piece.kind === "commission" ? "commission" : "personal");
    setClient(piece.client ?? "");
    setTags(piece.tags ?? []);
    setPlacement(index.places[piece.id] ?? { characters: [], collections: [] });
    setConfirming(false);
    setError(null);
  }, [piece, index.places]);

  if (!piece) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateArtwork(index.handle, piece!.id, { title, description, kind, client, tags, ...placement }).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: result.warning ?? `Saved “${title.trim()}”` });
      onClose();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteArtwork(index.handle, piece!.id).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: `Deleted “${piece!.title}”` });
      onClose();
    });
  }

  return (
    <GalleryDialogShell
      open
      onClose={onClose}
      title="Edit piece"
      wide
      footer={
        <>
          {confirming ? (
            <span className="mr-auto flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Delete it from every character and collection?</span>
              <button type="button" onClick={remove} disabled={pending} className={buttonClasses({ size: "sm", className: "bg-danger! text-white!" })}>
                Delete
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={buttonClasses({ variant: "ghost", className: "mr-auto text-danger!" })}>
              <Trash2 aria-hidden />
              Delete
            </button>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <button type="button" onClick={onClose} className={buttonClasses({ variant: "ghost" })}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending || !title.trim()} className={buttonClasses()}>
            {pending && <LoaderCircle aria-hidden className="animate-spin" />}
            Save
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="dot-paper flex items-center justify-center bg-[size:14px_14px] px-6 py-8">
          <span className="block rotate-[-1deg] bg-white p-2 shadow-lift">
            <Image
              src={piece.image.src}
              alt={piece.image.alt}
              width={piece.image.width}
              height={piece.image.height}
              sizes="(min-width: 768px) 480px, 90vw"
              className="block h-auto max-h-[50svh] w-auto max-w-full"
            />
          </span>
        </div>
        <div className="space-y-5 border-t border-paper-muted/15 px-6 py-6 md:border-t-0 md:border-l">
          <label className="block">
            <span className={fieldLabel}>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} aria-invalid={!title.trim() || undefined} className={`${ink} font-semibold`} />
          </label>
          <fieldset>
            <legend className={fieldLabel}>What is it</legend>
            <div className="mt-2 flex gap-2">
              {(["personal", "commission"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className="h-9 rounded-full border border-paper-muted/30 px-3.5 text-sm font-semibold transition-colors aria-pressed:border-ocean aria-pressed:bg-ocean aria-pressed:text-white"
                >
                  {k === "personal" ? "Personal work" : "A commission"}
                </button>
              ))}
            </div>
            {kind === "commission" && (
              <label className="mt-3 block">
                <span className={fieldLabel}>Made for</span>
                <input value={client} onChange={(e) => setClient(e.target.value)} maxLength={LIMITS.client} placeholder="@handle or a name" className={ink} />
              </label>
            )}
          </fieldset>
          <label className="block">
            <span className={fieldLabel}>About it</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={LIMITS.description}
              rows={2}
              className={`${ink} field-sizing-content max-h-40 resize-none`}
            />
          </label>
          <div>
            <label htmlFor={`${id}-tags`} className={fieldLabel}>
              Tags
            </label>
            <ChipInput id={`${id}-tags`} values={tags} onChange={setTags} max={LIMITS.tags} maxLength={LIMITS.tag} placeholder="fox, winter, ref…" prefix="#" />
          </div>
          <div>
            <p className={`${fieldLabel} mb-2`}>Show it on</p>
            <PlacementPicker index={index} value={placement} onChange={setPlacement} />
          </div>
        </div>
      </div>
    </GalleryDialogShell>
  );
}
