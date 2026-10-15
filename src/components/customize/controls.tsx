"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { hexToRgb, parseColor, rgbToHex } from "@/lib/customization/hex";
import { FREE, NAME_EFFECTS, type NameEffect } from "@/lib/customization/model";

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
  /** Tagged FLOW+ and saved only with it, but always previewable. */
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
              {locked && <FlowBadge />}
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

/** A color with a native picker, quick swatches, and its code (HEX or RGB) to copy or paste. */
export function ColorField({
  label,
  value,
  onChange,
  onClear,
  swatches = SWATCHES,
  palette,
  locked,
}: {
  label: string;
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear?: () => void;
  swatches?: string[];
  /** A second row of colors, like the ones already on the board. */
  palette?: { label: string; colors: string[] };
  locked?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
          {label}
          {locked && <FlowBadge />}
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
      {palette && palette.colors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[0.6875rem] font-medium text-muted">{palette.label}</span>
          {palette.colors.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`${label}: ${swatch}, ${palette.label.toLowerCase()}`}
              aria-pressed={value?.toLowerCase() === swatch}
              onClick={() => onChange(swatch)}
              className="size-6 rounded-full border border-border shadow-soft transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-ocean aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
              style={{ background: swatch }}
            />
          ))}
        </div>
      )}
      <ColorCode label={label} value={value} onChange={onChange} />
    </div>
  );
}

/*
 * How color codes are typed, HEX or RGB: one choice for every color field,
 * kept per browser (localStorage).
 */
type CodeMode = "hex" | "rgb";
const CODE_MODE_KEY = "artiflow-color-code";
let codeMode: CodeMode | null = null;
const codeModeListeners = new Set<() => void>();

function readCodeMode(): CodeMode {
  if (codeMode === null) {
    try {
      codeMode = localStorage.getItem(CODE_MODE_KEY) === "rgb" ? "rgb" : "hex";
    } catch {
      codeMode = "hex";
    }
  }
  return codeMode;
}

function setCodeMode(mode: CodeMode) {
  codeMode = mode;
  try {
    localStorage.setItem(CODE_MODE_KEY, mode);
  } catch {
    // Blocked storage: the choice holds for this page.
  }
  for (const listener of codeModeListeners) listener();
}

function useCodeMode() {
  return useSyncExternalStore(
    (listener) => {
      codeModeListeners.add(listener);
      return () => codeModeListeners.delete(listener);
    },
    readCodeMode,
    () => "hex" as CodeMode,
  );
}

const CHANNELS = [
  { key: "R", name: "red" },
  { key: "G", name: "green" },
  { key: "B", name: "blue" },
] as const;

/**
 * The color as a code, HEX or RGB: follows the picker live, copies in one
 * click, and takes a typed or pasted code (either kind, in either box).
 */
function ColorCode({ label, value, onChange }: { label: string; value: string | undefined; onChange: (hex: string) => void }) {
  const mode = useCodeMode();
  // What's being typed; null = show the current color.
  const [draft, setDraft] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = draft ?? value?.replace(/^#/, "").toUpperCase() ?? "";
  const rgb = channels ?? (value ? hexToRgb(value).map(String) : ["", "", ""]);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(mode === "hex" ? value.toUpperCase() : `rgb(${hexToRgb(value).join(", ")})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the code is still there to select by hand.
    }
  }

  function typeChannel(index: number, text: string) {
    const next = rgb.map((c, i) => (i === index ? text.replace(/\D/g, "").slice(0, 3) : c));
    setChannels(next);
    const values = next.map(Number);
    if (next.every((c) => c !== "") && values.every((c) => c <= 255)) onChange(rgbToHex(values[0], values[1], values[2]));
  }

  const box = "flex h-8 items-center gap-0.5 rounded-input border border-border bg-surface px-2 font-mono text-xs text-ink transition-colors focus-within:border-ocean";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <div role="radiogroup" aria-label={`${label}: code`} className="flex h-8 items-center rounded-input border border-border p-0.5">
        {(["hex", "rgb"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            onClick={() => setCodeMode(option)}
            className="h-full rounded-[7px] px-1.5 text-[0.625rem] font-bold text-muted transition-colors hover:text-ink aria-checked:bg-ice aria-checked:text-ink"
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
      {mode === "hex" ? (
        <label className={`${box} w-28`}>
          <span aria-hidden className="text-muted">
            #
          </span>
          <input
            value={shown}
            aria-label={`${label}: hex code`}
            placeholder="Hex"
            maxLength={20}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setDraft(e.target.value.replace(/^#/, "").toUpperCase());
              const hex = parseColor(e.target.value);
              if (hex) onChange(hex);
            }}
            onBlur={() => {
              const hex = draft !== null && parseColor(draft, { short: true });
              if (hex) onChange(hex);
              setDraft(null);
            }}
            className="w-full min-w-0 bg-transparent uppercase outline-none placeholder:normal-case placeholder:text-muted"
          />
        </label>
      ) : (
        <div
          className="flex gap-1"
          // Leaving the three boxes shows the current color again; moving between them keeps what's typed.
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setChannels(null)}
        >
          {CHANNELS.map(({ key, name }, i) => (
            <label key={key} className={`${box} w-14`}>
              <span aria-hidden className="text-muted">
                {key}
              </span>
              <input
                value={rgb[i]}
                inputMode="numeric"
                aria-label={`${label}: ${name} (0 to 255)`}
                placeholder="0"
                maxLength={3}
                autoComplete="off"
                onChange={(e) => typeChannel(i, e.target.value)}
                onPaste={(e) => {
                  // A whole "rgb(…)" or hex pasted into one box fills all three.
                  const hex = parseColor(e.clipboardData.getData("text"));
                  if (!hex) return;
                  e.preventDefault();
                  setChannels(null);
                  onChange(hex);
                }}
                className="w-full min-w-0 bg-transparent text-right outline-none placeholder:text-muted"
              />
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!value}
        onClick={copy}
        aria-label={`Copy ${label} ${mode === "hex" ? "hex" : "RGB"} code`}
        className="inline-flex h-8 items-center gap-1 rounded-input px-2 text-xs font-semibold text-muted transition-colors hover:bg-ice hover:text-ink disabled:opacity-40 [&_svg]:size-3.5"
      >
        {copied ? <Check aria-hidden className="text-ocean" /> : <Copy aria-hidden />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

/** Ready-made gradients, two or three stops (each editable once picked). */
export const GRADIENTS = [
  ["#ff7aa8", "#c04dff"],
  ["#00e0b4", "#4cc9f0"],
  ["#ff3948", "#ff762e", "#ffd166"],
  ["#9d7bff", "#5ee7ff"],
  ["#ffd166", "#ff6fa5"],
  ["#0788f9", "#8b83f6"],
];

/** A gradient for lettering (the profile name, the About board's text): pick one, then tune each stop. */
export function GradientField({
  label = "Gradient",
  value,
  isPaid,
  onChange,
  palette,
}: {
  label?: string;
  value: string[] | undefined;
  isPaid: boolean;
  onChange: (gradient: string[] | undefined) => void;
  palette?: { label: string; colors: string[] };
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
        {label} {!isPaid && <FlowBadge />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {GRADIENTS.map((stops) => (
          <button
            key={stops.join()}
            type="button"
            aria-label={`${label} ${stops.join(" to ")}`}
            aria-pressed={value?.join() === stops.join()}
            onClick={() => onChange(stops)}
            className="h-8 w-14 rounded-full border border-border shadow-soft transition-transform hover:scale-105 aria-pressed:ring-2 aria-pressed:ring-ocean aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
            style={{ background: `linear-gradient(100deg, ${stops.join(", ")})` }}
          />
        ))}
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="text-xs font-medium text-muted hover:text-ink">
            Remove
          </button>
        )}
      </div>
      {value && (
        <div className="mt-3 grid gap-3">
          {value.map((stop, i) => (
            <ColorField
              key={i}
              label={`${label} stop ${i + 1}`}
              value={stop}
              swatches={[]}
              palette={palette}
              onChange={(hex) => onChange(value.map((s, j) => (j === i ? hex : s)))}
              onClear={value.length > 2 ? () => onChange(value.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          {value.length < 3 && (
            <button
              type="button"
              onClick={() => onChange([...value, value[value.length - 1]])}
              className="justify-self-start text-xs font-semibold text-ocean-ink hover:underline dark:text-ocean"
            >
              + Add a third color
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** What each effect's color is, and what it is when the artist doesn't pick one. */
const EFFECT_COLOR_HINT: Record<Exclude<NameEffect, "none">, string> = {
  glow: "The glow. Unset, it glows in your accent.",
  sticker: "The die-cut edge. Unset, your card color.",
  outline: "The outline. Unset, the text's own color.",
  shimmer: "The light that runs across. Unset, white.",
};

/** A lettering effect (glow, sticker, outline, shimmer) and, once picked, its own color. */
export function EffectField({
  label = "Effect",
  value,
  effectColor,
  gradient,
  isPaid,
  onChange,
  palette,
}: {
  label?: string;
  value: NameEffect | undefined;
  effectColor: string | undefined;
  /** A gradient shimmer moves its own colors: no light to color. */
  gradient?: string[];
  isPaid: boolean;
  onChange: (patch: { effect?: NameEffect; effectColor?: string }) => void;
  palette?: { label: string; colors: string[] };
}) {
  const effect = value ?? "none";
  return (
    <div>
      <ChipGroup
        label={label}
        value={effect}
        isPaid={isPaid}
        onChange={(next) => onChange({ effect: next })}
        options={NAME_EFFECTS.map((option) => ({
          value: option,
          label: { none: "None", glow: "Glow", sticker: "Sticker", outline: "Outline", shimmer: "Shimmer" }[option],
          paid: !FREE.nameEffects.includes(option),
        }))}
      />
      {effect !== "none" && !(effect === "shimmer" && gradient) && (
        <div className="mt-3">
          <ColorField
            label={`${label} color`}
            value={effectColor}
            palette={palette}
            onChange={(color) => onChange({ effectColor: color })}
            onClear={() => onChange({ effectColor: undefined })}
          />
          <p className="mt-1.5 text-xs text-muted">{EFFECT_COLOR_HINT[effect]}</p>
        </div>
      )}
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
