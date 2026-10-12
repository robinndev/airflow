"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { HandNote } from "@/components/explore/doodles";
import type { GalleryIndex } from "@/lib/gallery/assemble";
import { CHARACTER_SECTIONS, type CharacterSection } from "@/lib/gallery/types";
import type { Placement } from "./store";

/*
 * The pieces every gallery dialog is made of: the dialog itself, ink-on-paper
 * fields, a chip input for tags and traits, the "Show it on" picker and the
 * cover picker.
 */

// Ink-on-paper fields: an underline you write on, not a box (as in Edit profile).
export const ink =
  "w-full border-0 border-b-2 border-dashed border-paper-muted/35 bg-transparent px-0.5 pt-1 pb-1.5 text-[0.9375rem] text-on-paper outline-none transition-colors placeholder:text-paper-muted/60 focus:border-solid focus:border-ocean aria-invalid:border-danger";

export const fieldLabel = "block text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase";

/** A modal sheet of paper, opened while `open` is true. Esc or × calls `onClose`. */
export function GalleryDialogShell({
  open,
  onClose,
  title,
  note,
  wide = false,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  note?: string;
  wide?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-1.5rem)] ${wide ? "w-[min(60rem,calc(100vw-1.5rem))]" : "w-[min(36rem,calc(100vw-1.5rem))]"} overflow-hidden rounded-panel bg-paper p-0 text-on-paper shadow-lift outline-none backdrop:bg-scrim/60 backdrop:backdrop-blur-[3px] open:flex open:flex-col`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-paper-muted/15 px-6 py-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="truncate font-display text-xl font-extrabold tracking-tight">{title}</h2>
          {note && (
            <HandNote tone="paper" className="hidden -rotate-2 text-xl sm:inline-block">
              {note}
            </HandNote>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-full text-paper-muted transition-colors hover:bg-paper-muted/10 hover:text-on-paper"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-paper-muted/15 px-6 py-4">{footer}</footer>
    </dialog>
  );
}

/** Type, then Enter or comma: each one becomes a chip. Backspace on empty removes the last. */
export function ChipInput({
  id,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  prefix = "",
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  prefix?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.replace(/,/g, " ").replace(/\s+/g, " ").trim().replace(/^#/, "").slice(0, maxLength);
    setDraft("");
    if (!value || values.length >= max || values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-dashed border-paper-muted/35 pb-1.5 focus-within:border-solid focus-within:border-ocean">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-full bg-lilac/12 py-0.5 pr-1 pl-2.5 text-sm font-semibold text-lilac-ink dark:text-lilac">
          {prefix}
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Remove ${value}`}
            className="grid size-5 place-items-center rounded-full hover:bg-lilac/20"
          >
            <X aria-hidden className="size-3" />
          </button>
        </span>
      ))}
      {values.length < max && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          maxLength={maxLength + 1}
          placeholder={values.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-[0.9375rem] text-on-paper outline-none placeholder:text-paper-muted/60"
        />
      )}
    </div>
  );
}

/** "Show it on": tick characters (each with its section) and collections. */
export function PlacementPicker({
  index,
  value,
  onChange,
}: {
  index: GalleryIndex;
  value: Placement;
  onChange: (value: Placement) => void;
}) {
  if (index.characters.length === 0 && index.collections.length === 0) {
    return <p className="text-sm text-paper-muted">Make a character or a collection first, and you can put pieces on them here.</p>;
  }

  const sectionOf = (id: string) => value.characters.find((c) => c.id === id)?.section;
  const toggleCharacter = (id: string) =>
    onChange({
      ...value,
      characters: sectionOf(id) ? value.characters.filter((c) => c.id !== id) : [...value.characters, { id, section: "art" }],
    });
  const setSection = (id: string, section: CharacterSection) =>
    onChange({ ...value, characters: value.characters.map((c) => (c.id === id ? { ...c, section } : c)) });
  const toggleCollection = (id: string) =>
    onChange({
      ...value,
      collections: value.collections.includes(id) ? value.collections.filter((c) => c !== id) : [...value.collections, id],
    });

  return (
    <div className="space-y-4">
      {index.characters.length > 0 && (
        <fieldset>
          <legend className={fieldLabel}>Characters</legend>
          <ul className="mt-2 space-y-1.5">
            {index.characters.map((c) => {
              const section = sectionOf(c.id);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Tick checked={!!section} onChange={() => toggleCharacter(c.id)} label={c.name} color={c.palette[0]} />
                  {section && (
                    <label className="flex items-center gap-1.5 text-sm text-paper-muted">
                      <span className="sr-only">Section for {c.name}</span>
                      in
                      <select
                        value={section}
                        onChange={(e) => setSection(c.id, e.target.value as CharacterSection)}
                        className="rounded-input border border-paper-muted/25 bg-paper px-2 py-1 text-sm font-semibold text-on-paper outline-none focus:border-ocean"
                      >
                        {CHARACTER_SECTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {index.collections.length > 0 && (
        <fieldset>
          <legend className={fieldLabel}>Collections</legend>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {index.collections.map((c) => (
              <li key={c.id}>
                <Tick checked={value.collections.includes(c.id)} onChange={() => toggleCollection(c.id)} label={c.title} />
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}

function Tick({ checked, onChange, label, color }: { checked: boolean; onChange: () => void; label: string; color?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 py-0.5 text-[0.9375rem] font-semibold">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className="grid size-5 place-items-center rounded-[6px] border-2 border-paper-muted/50 text-white transition-colors peer-checked:border-ocean peer-checked:bg-ocean peer-focus-visible:ring-2 peer-focus-visible:ring-ocean/40"
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {color && <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </label>
  );
}

/** Pick a cover among pieces: a strip of thumbnails, the chosen one ringed. */
export function CoverPicker({
  pieces,
  value,
  onChange,
  emptyNote,
}: {
  pieces: GalleryIndex["pieces"][string][];
  value: string | null;
  onChange: (id: string | null) => void;
  emptyNote: string;
}) {
  if (pieces.length === 0) return <p className="text-sm text-paper-muted">{emptyNote}</p>;
  return (
    <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
      {pieces.map((piece) => {
        const chosen = piece.id === value;
        return (
          <li key={piece.id} className="shrink-0">
            <button
              type="button"
              aria-pressed={chosen}
              aria-label={`Use ${piece.title} as the cover`}
              onClick={() => onChange(chosen ? null : piece.id)}
              className={`relative block overflow-hidden rounded-[8px] transition-[box-shadow,translate] ${chosen ? "-translate-y-0.5 ring-3 ring-ocean" : "ring-1 ring-paper-muted/20 hover:-translate-y-0.5"}`}
              style={{ backgroundColor: piece.image.palette?.[0] }}
            >
              <Image src={piece.image.src} alt="" width={piece.image.width} height={piece.image.height} sizes="96px" className="block h-20 w-auto" />
              {chosen && (
                <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-ocean text-white">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
