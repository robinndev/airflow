"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteCollection, saveCollection } from "@/app/(site)/[handle]/gallery/actions";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { LIMITS } from "@/lib/gallery/types";
import { CoverPicker, fieldLabel, GalleryDialogShell, ink } from "./fields";

/** Create or edit a collection: a title, a line about it, a cover. */
export function CollectionDialog({ index, collectionId, onClose }: { index: GalleryIndex; collectionId: string | null; onClose: () => void }) {
  const router = useRouter();
  const existing = collectionId ? index.collections.find((c) => c.id === collectionId) : undefined;
  // The dialog mounts for one collection (see <GalleryDialogs>), so its fields start from it.
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [coverId, setCoverId] = useState<string | null>(existing?.coverId ?? null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pieces = useMemo(() => {
    const all = Object.values(index.pieces);
    if (!existing) return all;
    const inside = (id: string) => index.places[id]?.collections.includes(existing.id);
    return [...all.filter((p) => inside(p.id)), ...all.filter((p) => !inside(p.id))];
  }, [index.pieces, index.places, existing]);

  function save() {
    startTransition(async () => {
      const result = await saveCollection(index.handle, collectionId, { title, description, coverId }).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: existing ? `Saved “${title.trim()}”` : `Made “${title.trim()}”`, link: result.href ? { label: "Open", href: result.href } : undefined });
      onClose();
      if (result.href && (!existing || existing.href !== result.href)) router.push(result.href);
    });
  }

  function remove() {
    if (!collectionId) return;
    startTransition(async () => {
      const result = await deleteCollection(index.handle, collectionId).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: `Deleted “${existing?.title}”. Its pieces are still in your gallery.` });
      onClose();
      if (result.href) router.push(result.href);
    });
  }

  return (
    <GalleryDialogShell
      open
      onClose={onClose}
      title={existing ? "Edit collection" : "New collection"}
      footer={
        <>
          {existing &&
            (confirming ? (
              <span className="mr-auto flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Delete it? The pieces stay.</span>
                <button type="button" onClick={remove} disabled={pending} className={buttonClasses({ size: "sm", className: "bg-danger! text-white!" })}>
                  Delete
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={buttonClasses({ variant: "ghost", className: "mr-auto text-danger!" })}>
                <Trash2 aria-hidden />
                Delete
              </button>
            ))}
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
            {existing ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-6">
        <label className="block">
          <span className={fieldLabel}>Title</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            maxLength={LIMITS.collectionTitle}
            placeholder="Fantasy landscapes, Expression studies…"
            className={`${ink} font-display text-xl font-extrabold`}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>About it (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.collectionDescription}
            rows={2}
            placeholder="A personal series, one a season."
            className={`${ink} field-sizing-content max-h-40 resize-none`}
          />
        </label>
        <div>
          <p className={`${fieldLabel} mb-2`}>Cover</p>
          <CoverPicker pieces={pieces} value={coverId} onChange={setCoverId} emptyNote="Add art to your gallery first, then pick a cover here." />
          {coverId && <p className="mt-1 text-xs text-paper-muted">The cover goes in the collection too.</p>}
        </div>
      </div>
    </GalleryDialogShell>
  );
}
