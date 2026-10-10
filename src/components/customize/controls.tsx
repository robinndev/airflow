"use client";

import { Check, Lock } from "lucide-react";
import type { ReactNode } from "react";

/* Small building blocks for the customizer panels. */

export function FlowBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-lilac to-ocean px-1.5 py-px text-[0.625rem] font-bold tracking-wide text-white ${className}`}
    >
      FLOW+
    </span>
  );
}

export function Section({
  title,
  hint,
  paid,
  children,
}: {
  title: string;
  hint?: string;
  /** Marks the whole section as Flow+. */
  paid?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border px-5 py-5 last:border-b-0">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink">
        {title}
        {paid && <FlowBadge />}
      </h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  /** Shown (and saved) only with Flow+, but always previewable. */
  paid?: boolean;
  /** Optional visual instead of / next to the label. */
  preview?: ReactNode;
};

/** A radio group of chips. Paid options stay clickable so people can preview them. */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  isPaid,
  columns,
}: {
  label: string;
  value: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
  isPaid: boolean;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={columns ? "grid gap-2" : "flex flex-wrap gap-2"}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const checked = option.value === value;
        const locked = option.paid && !isPaid;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`relative flex min-h-9 items-center justify-center gap-1.5 rounded-input border px-3 py-1.5 text-sm font-medium transition-[border-color,background-color,box-shadow] ${
              checked
                ? "border-ocean bg-ocean/[0.07] text-ink shadow-[0_0_0_1px_var(--ocean)]"
                : "border-border bg-surface text-ink hover:border-sky/60 hover:bg-ice/60"
            } ${option.preview ? "flex-col py-2" : ""}`}
          >
            {option.preview}
            <span className="inline-flex items-center gap-1">
              {option.label}
              {locked && <Lock aria-label="Flow+" className="size-3 text-lilac-ink" />}
            </span>
            {checked && option.preview && (
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-ocean text-white">
                <Check aria-hidden className="size-2.5" strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const SWATCHES = ["#173b5b", "#0788f9", "#21d4e5", "#8b83f6", "#f0679a", "#ff3948", "#ff762e", "#ffd166", "#4f8a3a", "#2c2a26", "#ffffff", "#0b101c"];

/** Hex color with a native picker and quick swatches. */
export function ColorField({
  label,
  value,
  onChange,
  onClear,
  swatches = SWATCHES,
  locked,
}: {
  label: string;
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear?: () => void;
  swatches?: string[];
  locked?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
          {label}
          {locked && <Lock aria-label="Flow+" className="size-3 text-lilac-ink" />}
        </span>
        {value && onClear && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-muted hover:text-ink">
            Reset
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <label
          className="relative size-8 cursor-pointer overflow-hidden rounded-full border border-border shadow-soft"
          style={{ background: value ?? "conic-gradient(#ff3948, #ffd166, #21d4e5, #8b83f6, #ff3948)" }}
          title="Pick any color"
        >
          <span className="sr-only">{label}: pick any color</span>
          <input
            type="color"
            value={value ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`${label}: ${swatch}`}
            aria-pressed={value?.toLowerCase() === swatch}
            onClick={() => onChange(swatch)}
            className="size-6 rounded-full border border-border shadow-soft transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-ocean aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
            style={{ background: swatch }}
          />
        ))}
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-semibold text-ink">
        {label}
        <span className="font-normal text-muted tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-ocean"
      />
    </label>
  );
}
