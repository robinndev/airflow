"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { saveAdoptable } from "@/app/(site)/studio/actions";
import { AdoptCard } from "@/components/explore/adopt-card";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import { ADOPT_INCLUDES, LIMITS } from "@/lib/listings/catalog";
import { adoptableInputOf, type AdoptableDraft } from "@/lib/listings/editable";
import { adoptableInput } from "@/lib/listings/schema";
import type { ImageAsset } from "@/lib/profile/types";
import { Block, ChipInput, Field, MoneyInput, Segmented, inputClass } from "./fields";
import { ListingImages } from "./listing-images";

type Artist = { handle: string; name: string; avatar: ImageAsset };

export const ADOPT_STATUS_OPTIONS = [
  { value: "available" as const, label: "Available", dot: "bg-mint-dot" },
  { value: "reserved" as const, label: "On hold", dot: "bg-star" },
  { value: "sold" as const, label: "Adopted", dot: "bg-like" },
];

/**
 * Listing a ready-made character: pictures, name, species, a fixed price and
 * what comes with it. The hang-tagged card on the right is what buyers see.
 */
export function AdoptableEditor({
  draft: initial,
  artist,
  onClose,
}: {
  draft: AdoptableDraft | null;
  artist: Artist;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AdoptableDraft | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const titleId = useId();

  useEffect(() => {
    setDraft(initial);
    setError(null);
    const dialog = dialogRef.current;
    if (initial && !dialog?.open) dialog?.showModal();
    if (!initial && dialog?.open) dialog.close();
  }, [initial]);

  const set = <K extends keyof AdoptableDraft>(key: K, value: AdoptableDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  function save() {
    if (!draft) return;
    const input = adoptableInputOf(draft);
    const check = adoptableInput.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Something's missing.");
    setError(null);
    startSaving(async () => {
      const result = await saveAdoptable(input);
      if (!result.ok) return setError(result.error);
      showToast({ message: draft.id ? "Listing saved" : `${draft.name} is up for adoption.` });
      onClose();
    });
  }

  const cover = draft?.images[0];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (saving) e.preventDefault();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-canvas p-0 text-ink outline-none backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] open:flex sm:m-auto sm:h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(62rem,calc(100vw-3rem))] sm:rounded-[28px] sm:shadow-lift"
    >
      {draft && (
        <div className="flex min-h-0 w-full flex-col">
          <header className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3.5 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase">Ready-made</p>
              <h2 id={titleId} className="truncate font-display text-xl font-extrabold">
                {draft.id ? `Edit ${draft.name || "listing"}` : "New adoptable"}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,1fr)_19rem] md:overflow-hidden">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="grid content-start gap-8 bg-surface px-5 py-6 sm:px-8 md:overflow-y-auto md:overscroll-contain"
            >
              <Block title="The character" note="Ref sheet first: it's the cover. Up to 4.">
                <ListingImages
                  label="Pictures"
                  value={draft.images}
                  onChange={(images) => set("images", images)}
                  max={LIMITS.adoptImages}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" htmlFor={`${titleId}-name`}>
                    <input
                      id={`${titleId}-name`}
                      value={draft.name}
                      maxLength={60}
                      placeholder="Pip"
                      onChange={(e) => set("name", e.target.value)}
                      className={`${inputClass} h-11 text-base`}
                    />
                  </Field>
                  <Field label="Species" htmlFor={`${titleId}-species`}>
                    <input
                      id={`${titleId}-species`}
                      value={draft.species}
                      maxLength={60}
                      placeholder="Bunny mechanic"
                      onChange={(e) => set("species", e.target.value)}
                      className={`${inputClass} h-11 text-base`}
                    />
                  </Field>
                </div>
                <Field label="About them" htmlFor={`${titleId}-about`} hint="Personality, lore, quirks. The new owner can change it all.">
                  <textarea
                    id={`${titleId}-about`}
                    value={draft.description}
                    maxLength={2000}
                    rows={4}
                    onChange={(e) => set("description", e.target.value)}
                    className={`${inputClass} resize-y py-2.5 leading-relaxed`}
                  />
                </Field>
              </Block>

              <Block title="Price" note="Fixed price: whoever pays first adopts it.">
                <Field label="Price" htmlFor={`${titleId}-price`}>
                  <MoneyInput id={`${titleId}-price`} label="Price" value={draft.priceUsd} onChange={(priceUsd) => set("priceUsd", priceUsd)} className="w-36" />
                </Field>
                <Field label="Comes with">
                  <ChipInput label="Comes with" value={draft.includes} onChange={(includes) => set("includes", includes)} suggestions={ADOPT_INCLUDES} />
                </Field>
              </Block>
              <button type="submit" hidden />
            </form>

            <aside aria-label="Preview" className="border-t border-border bg-canvas px-5 pt-8 pb-6 sm:px-8 md:overflow-y-auto md:border-t-0 md:border-l md:px-6">
              <p className="mb-8 text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase">How buyers see it</p>
              {cover ? (
                <div className="mx-auto max-w-60">
                  <AdoptCard
                    adopt={{
                      id: draft.id ?? "preview",
                      name: draft.name || "Unnamed",
                      species: draft.species || "Species",
                      image: { src: cover.src, alt: draft.name, width: cover.width, height: cover.height, palette: cover.palette },
                      artist: { ...artist, href: `/${artist.handle}` },
                      sale: { type: "flat", priceUsd: draft.priceUsd || 0 },
                      status: draft.status === "sold" ? "adopted" : draft.status,
                      href: "#",
                    }}
                  />
                </div>
              ) : (
                <div className="mx-auto grid aspect-4/5 max-w-60 place-items-center rounded-[20px] border-2 border-dashed border-border text-center text-sm text-muted">
                  Add a picture to see the card
                </div>
              )}
            </aside>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-5 py-3.5 sm:px-6">
            <Segmented label="Status" value={draft.status} onChange={(status) => set("status", status)} options={ADOPT_STATUS_OPTIONS} />
            <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm text-danger empty:hidden">
              {error}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses({ variant: "ghost" })}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className={buttonClasses({ className: "min-w-32" })}>
                {saving && <LoaderCircle aria-hidden className="animate-spin" />}
                {saving ? "Saving…" : draft.id ? "Save changes" : "List it"}
              </button>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}
