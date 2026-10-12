"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/* Small form pieces shared by the studio's editors. */

export const inputClass =
  "w-full rounded-input border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ocean disabled:opacity-60";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** A titled block of the editor, like a section of a commission sheet. */
export function Block({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-dashed border-border pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="mt-4 grid gap-5">{children}</div>
    </section>
  );
}

/** Dollars, whole or with cents. */
export function MoneyInput({
  value,
  onChange,
  label,
  id,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  id?: string;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  // Follow outside changes (presets) without fighting the person typing.
  if (Number(text) !== value && !(text === "" && value === 0)) setText(String(value));
  return (
    <span className={`relative block ${className}`}>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
        $
      </span>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9.]/g, "");
          setText(next);
          onChange(next === "" ? 0 : Number(next));
        }}
        className={`${inputClass} h-10 pl-6 tabular-nums`}
      />
    </span>
  );
}

/**
 * One-click choice drawn as a row of options (a radio group underneath, so
 * arrows and screen readers work).
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  disabled = false,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; dot?: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-full border border-border bg-canvas p-0.5">
      {options.map((option) => (
        <label
          key={option.value}
          className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full font-semibold transition-colors has-checked:bg-surface has-checked:text-ink has-checked:shadow-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ocean ${
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm"
          } ${disabled ? "pointer-events-none opacity-60" : "text-muted hover:text-ink"}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.dot && <span aria-hidden className={`size-2 rounded-full ${option.dot}`} />}
          {option.label}
        </label>
      ))}
    </div>
  );
}

/**
 * A short list of things (what's included): chips you can remove, a field to
 * add your own, and one-tap suggestions.
 */
export function ChipInput({
  label,
  value,
  onChange,
  suggestions = [],
  max = 8,
  placeholder = "Add and press Enter",
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  max?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const full = value.length >= max;
  const add = (item: string) => {
    const clean = item.trim().slice(0, 60);
    if (!clean || full || value.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
  };
  const left = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <ul aria-label={label} className="flex flex-wrap gap-1.5">
        {value.map((item) => (
          <li key={item} className="inline-flex h-8 items-center gap-1 rounded-full bg-ice pr-1 pl-3 text-sm font-medium text-ink">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((v) => v !== item))}
              className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </li>
        ))}
        {!full && (
          <li className="min-w-40 flex-1">
            <input
              aria-label={`Add to ${label}`}
              value={text}
              maxLength={60}
              placeholder={placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add(text);
                  setText("");
                } else if (e.key === "Backspace" && !text && value.length) {
                  onChange(value.slice(0, -1));
                }
              }}
              onBlur={() => {
                add(text);
                setText("");
              }}
              className={`${inputClass} h-8 rounded-full`}
            />
          </li>
        )}
      </ul>
      {left.length > 0 && !full && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {left.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs font-medium text-muted transition-colors hover:border-ocean/50 hover:text-ink"
            >
              <Plus aria-hidden className="size-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
