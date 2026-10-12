"use client";

import Image from "next/image";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { deleteCharacter, saveCharacter } from "@/app/(site)/[handle]/gallery/actions";
import { HandNote, Tape } from "@/components/explore/doodles";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { characterPalette, LIMITS } from "@/lib/gallery/types";
import { ChipInput, CoverPicker, fieldLabel, GalleryDialogShell, ink } from "./fields";

/*
 * A character's file, written as a sketchbook spread: on the left the ref
 * sheet card redraws itself as you type (name, hand-written line, colors,
 * traits); on the right, the page you write on.
 */

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they", "it/its", "any/all"];

type Form = {
  name: string;
  tagline: string;
  species: string;
  pronouns: string;
  story: string;
  traits: string[];
  tags: string[];
  palette: string[];
  designer: string;
  coverId: string | null;
  adoptableId: string | null;
};

const blank: Form = {
  name: "",
  tagline: "",
  species: "",
  pronouns: "",
  story: "",
  traits: [],
  tags: [],
  palette: [],
  designer: "",
  coverId: null,
  adoptableId: null,
};

export function CharacterDialog({
  index,
  characterId,
  onClose,
}: {
  index: GalleryIndex;
  /** null: a new character. */
  characterId: string | null;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const existing = characterId ? index.characters.find((c) => c.id === characterId) : undefined;
  const [form, setForm] = useState<Form>(blank);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setForm(
      existing
        ? {
            name: existing.name,
            tagline: existing.tagline,
            species: existing.species,
            pronouns: existing.pronouns,
            story: existing.story,
            traits: existing.traits,
            tags: existing.tags,
            palette: existing.ownPalette,
            designer: existing.designer ?? "",
            coverId: existing.coverId ?? null,
            adoptableId: index.adoptableOf[existing.id] ?? null,
          }
        : blank,
    );
    setConfirming(false);
    setError(null);
  }, [existing, index.adoptableOf]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  // Covers: their own art first (when editing), then the rest of the gallery.
  const pieces = useMemo(() => {
    const all = Object.values(index.pieces);
    if (!existing) return all;
    const theirs = new Set(Object.entries(index.places).flatMap(([pieceId, p]) => (p.characters.some((c) => c.id === existing.id) ? [pieceId] : [])));
    return [...all.filter((p) => theirs.has(p.id)), ...all.filter((p) => !theirs.has(p.id))];
  }, [index.pieces, index.places, existing]);

  const cover = form.coverId ? index.pieces[form.coverId]?.image : undefined;
  const colors = characterPalette(form.palette, cover);
  const usingCoverColors = form.palette.length === 0;

  function save() {
    startTransition(async () => {
      const result = await saveCharacter(index.handle, characterId, form).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: characterId ? `Saved ${form.name.trim()}` : `${form.name.trim()} has a page now`, link: result.href ? { label: "Open", href: result.href } : undefined });
      onClose();
      // A new name is a new address.
      if (result.href && (!existing || existing.href !== result.href)) router.push(result.href);
    });
  }

  function remove() {
    if (!characterId) return;
    startTransition(async () => {
      const result = await deleteCharacter(index.handle, characterId).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Couldn't reach the studio. Try again in a moment.");
      showToast({ message: `Deleted ${existing?.name}'s page. Their art is still in your gallery.` });
      onClose();
      if (result.href) router.push(result.href);
    });
  }

  return (
    <GalleryDialogShell
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "New character"}
      note={existing ? undefined : "say hi!"}
      wide
      footer={
        <>
          {existing &&
            (confirming ? (
              <span className="mr-auto flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Delete the page? Their art stays in your gallery.</span>
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
          <button type="button" onClick={save} disabled={pending || !form.name.trim()} className={buttonClasses()}>
            {pending && <LoaderCircle aria-hidden className="animate-spin" />}
            {existing ? "Save" : "Create page"}
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* The ref sheet card, live. */}
        <div className="relative overflow-hidden bg-ice px-6 py-8">
          <figure className="relative mx-auto max-w-[17rem] rotate-[-1.2deg] rounded-[14px] bg-paper px-5 pt-6 pb-5 text-on-paper shadow-lift grain">
            <Tape color={colors[0]} tone="lilac" className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
            <div className="flex h-40 items-center justify-center">
              {cover ? (
                <Image src={cover.src} alt="" width={cover.width} height={cover.height} sizes="240px" className="block h-auto max-h-40 w-auto max-w-full shadow-soft" />
              ) : (
                <span className="grid size-28 place-items-center rounded-full border-2 border-dashed border-paper-muted/40 text-center font-hand text-lg leading-tight text-paper-muted">
                  pick a cover
                </span>
              )}
            </div>
            <p className="mt-4 truncate font-display text-2xl font-extrabold">{form.name.trim() || "Their name"}</p>
            <p className="mt-0.5 font-hand text-xl leading-tight text-paper-muted">{form.tagline.trim() || "a line in your hand"}</p>
            {(form.species || form.pronouns) && (
              <p className="mt-2 text-xs font-semibold text-paper-muted">{[form.species, form.pronouns].filter(Boolean).join(" · ")}</p>
            )}
            {colors.length > 0 && (
              <span className="mt-3 flex overflow-hidden rounded-full">
                {colors.map((c) => (
                  <span key={c} className="h-4 flex-1" style={{ backgroundColor: c }} />
                ))}
              </span>
            )}
            {form.traits.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-1.5">
                {form.traits.map((t) => (
                  <span key={t} className="rounded-full border-[1.5px] border-current px-2 py-0.5 font-display text-[0.6875rem] font-bold text-lilac-ink dark:text-lilac">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </figure>
          <HandNote tone="muted" className="mt-6 block rotate-[-2deg] text-center text-lg">
            their page grows as you add art
          </HandNote>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={fieldLabel}>Name</span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={LIMITS.name}
                placeholder="Luna"
                className={`${ink} font-display text-xl font-extrabold`}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={fieldLabel}>One line about them</span>
              <input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                maxLength={LIMITS.tagline}
                placeholder="Naps anywhere. Melts above 30°C."
                className={ink}
              />
            </label>
            <label className="block">
              <span className={fieldLabel}>Species</span>
              <input value={form.species} onChange={(e) => set("species", e.target.value)} maxLength={LIMITS.species} placeholder="Fox spirit, human, dragon…" className={ink} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Pronouns</span>
              <input value={form.pronouns} onChange={(e) => set("pronouns", e.target.value)} maxLength={LIMITS.pronouns} list={`${id}-pronouns`} placeholder="she/her" className={ink} />
              <datalist id={`${id}-pronouns`}>
                {PRONOUNS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
          </div>

          <div>
            <p className={`${fieldLabel} mb-2`}>Cover</p>
            <CoverPicker
              pieces={pieces}
              value={form.coverId}
              onChange={(v) => set("coverId", v)}
              emptyNote="Add art to your gallery first, then pick their cover here (you can also make the page now and add art later)."
            />
          </div>

          <div>
            <label htmlFor={`${id}-traits`} className={fieldLabel}>
              Personality
            </label>
            <ChipInput id={`${id}-traits`} values={form.traits} onChange={(v) => set("traits", v)} max={LIMITS.traits} maxLength={LIMITS.trait} placeholder="Sleepy, curious, loyal to snacks…" />
          </div>

          <label className="block">
            <span className={fieldLabel}>Their story</span>
            <textarea
              value={form.story}
              onChange={(e) => set("story", e.target.value)}
              maxLength={LIMITS.story}
              rows={4}
              placeholder="Where they come from, what they want, who they love…"
              className={`${ink} field-sizing-content max-h-72 min-h-24 resize-none leading-relaxed`}
            />
          </label>

          <div>
            <p className={fieldLabel}>Colors</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {colors.map((color, i) => (
                <span key={`${color}-${i}`} className="group/swatch relative">
                  <label className="block cursor-pointer">
                    <span className="sr-only">Color {i + 1}</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const next = [...colors];
                        next[i] = e.target.value.toLowerCase();
                        set("palette", next);
                      }}
                      className="sr-only"
                    />
                    <span className="block size-10 rounded-[10px] shadow-soft ring-2 ring-paper" style={{ backgroundColor: color }} />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove color ${i + 1}`}
                    onClick={() => set("palette", colors.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 hidden size-5 place-items-center rounded-full bg-ink text-on-ink group-hover/swatch:grid"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </span>
              ))}
              {colors.length < LIMITS.palette && (
                <label className="grid size-10 cursor-pointer place-items-center rounded-[10px] border-2 border-dashed border-paper-muted/40 text-paper-muted hover:border-ocean hover:text-ocean">
                  <span className="sr-only">Add a color</span>
                  <Plus aria-hidden className="size-4" />
                  <input type="color" onChange={(e) => set("palette", [...colors, e.target.value.toLowerCase()])} className="sr-only" />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-xs text-paper-muted">
              {usingCoverColors ? "Taken from the cover until you change one." : "Click a swatch to change it."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabel}>Designed by</span>
              <input value={form.designer} onChange={(e) => set("designer", e.target.value)} maxLength={LIMITS.designer} placeholder="You, or @handle / a name" className={ink} />
            </label>
            {index.adoptables.length > 0 && (
              <label className="block">
                <span className={fieldLabel}>Up for adoption</span>
                <select
                  value={form.adoptableId ?? ""}
                  onChange={(e) => set("adoptableId", e.target.value || null)}
                  className="mt-1 w-full rounded-input border border-paper-muted/25 bg-paper px-2.5 py-2 text-sm font-semibold text-on-paper outline-none focus:border-ocean"
                >
                  <option value="">Not for sale</option>
                  {index.adoptables.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.status === "sold" ? " (adopted)" : a.status === "reserved" ? " (on hold)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-tags`} className={fieldLabel}>
              Tags
            </label>
            <ChipInput id={`${id}-tags`} values={form.tags} onChange={(v) => set("tags", v)} max={LIMITS.tags} maxLength={LIMITS.tag} placeholder="kitsune, fantasy…" prefix="#" />
          </div>
        </div>
      </div>
    </GalleryDialogShell>
  );
}
