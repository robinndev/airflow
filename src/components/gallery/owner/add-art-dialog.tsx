"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addArtworks } from "@/app/(site)/[handle]/gallery/actions";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { LIMITS } from "@/lib/gallery/types";
import type { StoredImage } from "@/lib/art-storage";
import { discardArt, prepareImage, uploadArt, type PreparedImage } from "@/lib/images/prepare";
import { ChipInput, fieldLabel, GalleryDialogShell, ink, PlacementPicker } from "./fields";
import type { Placement } from "./store";

/*
 * Add art: pick up to 12 pictures, title each, then say what they are and
 * where they go (characters and their sections, collections). Pictures are
 * checked for AI generators' marks and prepared in the browser, uploaded
 * straight to storage, then saved in one go.
 */

type Draft = PreparedImage & { key: string; title: string };

/** "kinako_winter-coat.final.png" → "Kinako winter coat final". */
function titleFromFile(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, LIMITS.title) || "Untitled";
}

export function AddArtDialog({
  index,
  open,
  preset,
  onClose,
}: {
  index: GalleryIndex;
  open: boolean;
  preset?: Placement;
  onClose: () => void;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [kind, setKind] = useState<"personal" | "commission">("personal");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [placement, setPlacement] = useState<Placement>(preset ?? { characters: [], collections: [] });
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRefusal, setAiRefusal] = useState<AiImageError | null>(null);
  const [pending, startTransition] = useTransition();

  // A fresh sheet every time it opens.
  useEffect(() => {
    if (!open) return;
    setDrafts([]);
    setKind("personal");
    setClient("");
    setDescription("");
    setTags([]);
    setPlacement(preset ?? { characters: [], collections: [] });
    setError(null);
  }, [open, preset]);

  function close() {
    for (const d of drafts) URL.revokeObjectURL(d.previewUrl);
    onClose();
  }

  async function pick(files: File[]) {
    if (files.length === 0) return;
    const room = LIMITS.batch - drafts.length;
    setError(files.length > room ? `Up to ${LIMITS.batch} at a time: kept the first ${room}.` : null);
    setPreparing(true);
    try {
      const results = await Promise.allSettled(files.slice(0, room).map((file) => prepareImage(file, 2400, { allowPng: true, thumb: true, original: true })));
      const ready = results.flatMap((r, i) =>
        r.status === "fulfilled" ? [{ ...r.value, key: crypto.randomUUID(), title: titleFromFile(files[i].name) }] : [],
      );
      setDrafts((current) => [...current, ...ready].slice(0, LIMITS.batch));
      const failure = results.find((r) => r.status === "rejected")?.reason;
      if (failure instanceof AiImageError) setAiRefusal(failure);
      else if (failure) setError(failure instanceof Error ? failure.message : "Couldn't read that image.");
    } finally {
      setPreparing(false);
    }
  }

  function remove(key: string) {
    setDrafts((current) => {
      const gone = current.find((d) => d.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((d) => d.key !== key);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const stored: StoredImage[] = [];
      try {
        for (const draft of drafts) stored.push(await uploadArt(draft, "gallery"));
      } catch (e) {
        await Promise.all(stored.map(discardArt));
        setError(e instanceof Error ? e.message : "Upload failed. Try again.");
        return;
      }
      const result = await addArtworks(index.handle, {
        items: drafts.map((d, i) => ({ ...stored[i], palette: d.palette, title: d.title })),
        kind,
        client,
        description,
        tags,
        ...placement,
      }).catch(() => null);
      if (!result?.ok) {
        // Nothing was saved: the uploads would be orphans.
        await Promise.all(stored.map(discardArt));
        setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
        return;
      }
      showToast({
        message:
          result.warning ?? (drafts.length === 1 ? `“${drafts[0].title}” is in your gallery` : `${drafts.length} pieces added to your gallery`),
      });
      close();
    });
  }

  const busy = pending || preparing;

  return (
    <>
      <GalleryDialogShell
        open={open}
        onClose={close}
        title="Add art"
        note="fresh off the easel"
        wide
        footer={
          <>
            {error && (
              <p role="alert" className="mr-auto text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <button type="button" onClick={close} className={buttonClasses({ variant: "ghost" })}>
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || drafts.length === 0 || drafts.some((d) => !d.title.trim())}
              className={buttonClasses()}
            >
              {pending && <LoaderCircle aria-hidden className="animate-spin" />}
              {drafts.length > 1 ? `Add ${drafts.length} pieces` : "Add to gallery"}
            </button>
          </>
        }
      >
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="dot-paper bg-[size:14px_14px] px-6 py-6">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              aria-label="Choose pictures"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                void pick(files);
              }}
            />
            {drafts.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void pick([...e.dataTransfer.files]);
                }}
                className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-paper-muted/40 bg-paper/70 p-6 text-center text-paper-muted transition-colors hover:border-ocean hover:text-ocean"
              >
                {preparing ? <LoaderCircle aria-hidden className="size-8 animate-spin" /> : <ImagePlus aria-hidden className="size-8" />}
                <span className="font-display text-lg font-extrabold text-on-paper">Choose pictures or drop them here</span>
                <span className="text-sm">PNG, JPG or WebP, up to {LIMITS.batch} at a time. Made by you, no generative AI.</span>
              </button>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {drafts.map((draft, i) => (
                  <li key={draft.key} className="min-w-0">
                    <div
                      className="relative flex h-32 items-center justify-center rounded-[6px] bg-paper p-1.5 shadow-soft"
                      style={{ backgroundColor: `color-mix(in oklab, ${draft.palette[0] ?? "var(--paper)"} 18%, var(--paper))` }}
                    >
                      <Image
                        src={draft.previewUrl}
                        alt={`Picture ${i + 1}`}
                        width={draft.width}
                        height={draft.height}
                        unoptimized
                        className="block h-auto max-h-full w-auto max-w-full shadow-soft"
                      />
                      <button
                        type="button"
                        onClick={() => remove(draft.key)}
                        aria-label={`Remove picture ${i + 1}`}
                        className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-ink text-on-ink shadow-soft"
                      >
                        <X aria-hidden className="size-3.5" />
                      </button>
                    </div>
                    <label htmlFor={`${id}-title-${draft.key}`} className="sr-only">
                      Title of picture {i + 1}
                    </label>
                    <input
                      id={`${id}-title-${draft.key}`}
                      value={draft.title}
                      maxLength={LIMITS.title}
                      onChange={(e) => setDrafts((all) => all.map((d) => (d.key === draft.key ? { ...d, title: e.target.value } : d)))}
                      aria-invalid={!draft.title.trim() || undefined}
                      className={`${ink} mt-2 text-sm font-semibold`}
                    />
                  </li>
                ))}
                {drafts.length < LIMITS.batch && (
                  <li>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-[6px] border-2 border-dashed border-paper-muted/40 text-sm font-semibold text-paper-muted transition-colors hover:border-ocean hover:text-ocean"
                    >
                      {preparing ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <ImagePlus aria-hidden className="size-5" />}
                      More
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="space-y-5 border-t border-paper-muted/15 px-6 py-6 md:border-t-0 md:border-l">
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
              <span className={fieldLabel}>About it (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={LIMITS.description}
                rows={2}
                placeholder="Process, story, tools…"
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
      <AiImageDialog error={aiRefusal} onClose={() => setAiRefusal(null)} onPickAnother={() => fileRef.current?.click()} />
    </>
  );
}
