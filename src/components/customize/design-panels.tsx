"use client";

import Link from "next/link";
import { ImagePlus, LoaderCircle, ShoppingBag, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { FrameArt } from "@/components/frames/avatar-frame";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import { FREE, NAME_EFFECTS, NAME_FONTS, THEME_PRESETS, type Customization, type ThemePreset } from "@/lib/customization/model";
import { resolvePalette } from "@/lib/customization/style";
import { FRAMES, formatFramePrice, isFreeFrame, type FrameId } from "@/lib/frames";
import { prepareImage, uploadArt } from "@/lib/images/prepare";
import { ChipGroup, ColorField, FlowBadge, Section } from "./controls";

type Props = {
  custom: Customization;
  isPaid: boolean;
  onChange: (next: Customization) => void;
};

/* ------------------------------------------------------------------ theme */

export function ThemePanel({ custom, isPaid, onChange }: Props) {
  const set = (patch: Partial<Customization["theme"]>) => onChange({ ...custom, theme: { ...custom.theme, ...patch } });
  const palette = resolvePalette(custom);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRefusal, setAiRefusal] = useState<AiImageError | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const image = await prepareImage(file, 2400, { allowGif: isPaid, allowPng: true });
      URL.revokeObjectURL(image.previewUrl);
      const path = await uploadArt(image, "about");
      onChange({ ...custom, background: { ...custom.background, image: { path, width: image.width, height: image.height } } });
    } catch (err) {
      if (err instanceof AiImageError) setAiRefusal(err);
      else setError(err instanceof Error ? err.message : "That image didn't upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Section title="Palette" hint="Your page's colors. “Follow the site” matches each visitor's Aqua or Ember.">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
            const preset = THEME_PRESETS[key];
            const checked = custom.theme.preset === key && !custom.theme.canvas;
            const locked = !FREE.presets.includes(key) && !isPaid;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={checked}
                onClick={() => onChange({ ...custom, theme: { preset: key } })}
                className="group relative overflow-hidden rounded-card border border-border text-left transition-[box-shadow,border-color] hover:border-sky/60 aria-pressed:border-ocean aria-pressed:shadow-[0_0_0_1px_var(--ocean)]"
              >
                <span
                  className="flex h-12 items-end gap-1 p-1.5"
                  style={{ background: preset.canvas || "linear-gradient(135deg, #f6fbff 50%, #0b101c 50%)" }}
                >
                  <span className="h-6 flex-1 rounded-[5px]" style={{ background: preset.surface || "#ffffff80" }} />
                  <span className="size-4 rounded-full" style={{ background: preset.accent || "linear-gradient(135deg,#0788f9,#ff3948)" }} />
                </span>
                <span className="flex items-center justify-between gap-1 bg-surface px-2 py-1.5 text-xs font-semibold text-ink">
                  {preset.label}
                  {locked && <FlowBadge />}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Your own colors" hint="Start from any palette and tune each color." paid={!isPaid}>
        <div className="grid gap-4">
          {(
            [
              ["canvas", "Page"],
              ["surface", "Cards"],
              ["ink", "Text"],
              ["accent", "Accent & buttons"],
            ] as const
          ).map(([key, label]) => (
            <ColorField
              key={key}
              label={label}
              value={custom.theme[key] ?? palette?.[key]}
              onChange={(hex) =>
                set({
                  // Customizing starts from what's on screen, so untouched colors don't jump.
                  canvas: custom.theme.canvas ?? palette?.canvas ?? "#f6fbff",
                  surface: custom.theme.surface ?? palette?.surface ?? "#ffffff",
                  ink: custom.theme.ink ?? palette?.ink ?? "#173b5b",
                  accent: custom.theme.accent ?? palette?.accent ?? "#0788f9",
                  [key]: hex,
                })
              }
              onClear={
                custom.theme.canvas ? () => onChange({ ...custom, theme: { preset: custom.theme.preset } }) : undefined
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Background">
        <ChipGroup
          label="Pattern"
          value={custom.background.pattern}
          isPaid={isPaid}
          onChange={(pattern) => onChange({ ...custom, background: { ...custom.background, pattern } })}
          options={[
            { value: "none", label: "Plain" },
            { value: "dots", label: "Dots" },
            { value: "grid", label: "Grid", paid: true },
            { value: "paper", label: "Notebook", paid: true },
            { value: "stars", label: "Stars", paid: true },
            { value: "hearts", label: "Hearts", paid: true },
          ]}
        />
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-2 rounded-input border border-border px-3 text-sm font-semibold text-ink transition-colors hover:bg-ice disabled:opacity-60 [&_svg]:size-4"
          >
            {uploading ? <LoaderCircle aria-hidden className="animate-spin" /> : <ImagePlus aria-hidden />}
            {custom.background.image ? "Replace background image" : "Background image"}
          </button>
          {!isPaid && <FlowBadge />}
          {custom.background.image && (
            <button
              type="button"
              aria-label="Remove background image"
              onClick={() => onChange({ ...custom, background: { pattern: custom.background.pattern } })}
              className="grid size-9 place-items-center rounded-input text-muted hover:bg-ice hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
        <AiImageDialog error={aiRefusal} onClose={() => setAiRefusal(null)} onPickAnother={() => fileRef.current?.click()} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------- name */

export function NamePanel({ custom, isPaid, onChange, displayName }: Props & { displayName: string }) {
  const name = custom.name;
  const set = (patch: Partial<Customization["name"]>) => onChange({ ...custom, name: { ...name, ...patch } });
  const gradient = name.gradient;

  return (
    <>
      <Section title="Font" hint="How your name is lettered on your page.">
        <ChipGroup
          label="Name font"
          value={name.font}
          isPaid={isPaid}
          columns={2}
          onChange={(font) => set({ font })}
          options={(Object.keys(NAME_FONTS) as (keyof typeof NAME_FONTS)[]).map((key) => ({
            value: key,
            label: NAME_FONTS[key].label,
            paid: !FREE.nameFonts.includes(key),
            preview: (
              <span className="max-w-full truncate text-lg leading-tight" style={{ fontFamily: NAME_FONTS[key].family }}>
                {displayName}
              </span>
            ),
          }))}
        />
      </Section>

      <Section title="Color">
        <div className="grid gap-4">
          <ColorField
            label="Solid color"
            value={gradient ? undefined : name.color}
            onChange={(color) => set({ color, gradient: undefined })}
            onClear={() => set({ color: undefined })}
          />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              Gradient {!isPaid && <FlowBadge />}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["#ff7aa8", "#c04dff"],
                ["#00e0b4", "#4cc9f0"],
                ["#ff3948", "#ff762e", "#ffd166"],
                ["#9d7bff", "#5ee7ff"],
                ["#ffd166", "#ff6fa5"],
                ["#0788f9", "#8b83f6"],
              ].map((stops) => (
                <button
                  key={stops.join()}
                  type="button"
                  aria-label={`Gradient ${stops.join(" to ")}`}
                  aria-pressed={gradient?.join() === stops.join()}
                  onClick={() => set({ gradient: stops, color: undefined })}
                  className="h-8 w-14 rounded-full border border-border shadow-soft transition-transform hover:scale-105 aria-pressed:ring-2 aria-pressed:ring-ocean aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
                  style={{ background: `linear-gradient(100deg, ${stops.join(", ")})` }}
                />
              ))}
              {gradient && (
                <button type="button" onClick={() => set({ gradient: undefined })} className="text-xs font-medium text-muted hover:text-ink">
                  Remove
                </button>
              )}
            </div>
            {gradient && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {gradient.map((stop, i) => (
                  <ColorField
                    key={i}
                    label={`Stop ${i + 1}`}
                    value={stop}
                    swatches={[]}
                    onChange={(hex) => set({ gradient: gradient.map((s, j) => (j === i ? hex : s)) })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Effect">
        <ChipGroup
          label="Name effect"
          value={name.effect}
          isPaid={isPaid}
          onChange={(effect) => set({ effect })}
          options={NAME_EFFECTS.map((effect) => ({
            value: effect,
            label: { none: "None", glow: "Glow", sticker: "Sticker", outline: "Outline", shimmer: "Shimmer" }[effect],
            paid: !FREE.nameEffects.includes(effect),
          }))}
        />
      </Section>
    </>
  );
}

/* ------------------------------------------------------- buttons + layout */

export function ButtonsPanel({ custom, isPaid, onChange }: Props) {
  const radius = { rounded: "12px", pill: "999px", square: "4px", sketch: "255px 15px 225px 15px / 15px 225px 15px 255px" };
  return (
    <>
      <Section title="Button shape" hint="Every action on your page follows it.">
        <ChipGroup
          label="Button shape"
          value={custom.buttons.shape}
          isPaid={isPaid}
          columns={2}
          onChange={(shape) => onChange({ ...custom, buttons: { ...custom.buttons, shape } })}
          options={(["rounded", "pill", "square", "sketch"] as const).map((shape) => ({
            value: shape,
            label: { rounded: "Rounded", pill: "Pill", square: "Square", sketch: "Hand-drawn" }[shape],
            paid: !FREE.buttonShapes.includes(shape),
            preview: <span className="h-6 w-20 border-2 border-ocean bg-ocean/15" style={{ borderRadius: radius[shape] }} />,
          }))}
        />
      </Section>
      <Section title="Button style" paid={!isPaid}>
        <ChipGroup
          label="Button style"
          value={custom.buttons.style}
          isPaid={isPaid}
          onChange={(style) => onChange({ ...custom, buttons: { ...custom.buttons, style } })}
          options={[
            { value: "solid", label: "Solid" },
            { value: "soft", label: "Soft", paid: true },
            { value: "outline", label: "Outline", paid: true },
          ]}
        />
      </Section>
      <Section title="Layout" paid={!isPaid} hint="Which side your commissions, links and gallery sit on.">
        <ChipGroup
          label="Sidebar side"
          value={custom.layout.sidebar}
          isPaid={isPaid}
          onChange={(sidebar) => onChange({ ...custom, layout: { sidebar } })}
          options={[
            { value: "left", label: "Sidebar left" },
            { value: "right", label: "Sidebar right", paid: true },
          ]}
        />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ frame */

export function FramePanel({ custom, onChange, owned }: Props & { owned: string[] }) {
  return (
    <Section title="Avatar frame" hint="Free frames are yours to wear. Paid ones come from the shop.">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={!custom.frame}
          onClick={() => onChange({ ...custom, frame: undefined })}
          className="grid aspect-square place-items-center rounded-card border border-border text-xs font-semibold text-muted transition-colors hover:bg-ice aria-pressed:border-ocean aria-pressed:shadow-[0_0_0_1px_var(--ocean)]"
        >
          No frame
        </button>
        {FRAMES.map((frame) => {
          const have = isFreeFrame(frame.id) || owned.includes(frame.id);
          return (
            <button
              key={frame.id}
              type="button"
              aria-pressed={custom.frame === frame.id}
              aria-label={`${frame.name}${have ? "" : `, ${formatFramePrice(frame)} in the shop`}`}
              onClick={() => onChange({ ...custom, frame: frame.id as FrameId })}
              className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface p-2 transition-colors hover:bg-ice/60 aria-pressed:border-ocean aria-pressed:shadow-[0_0_0_1px_var(--ocean)]"
            >
              <span className="relative grid size-11 place-items-center">
                <span className="size-11 rounded-full bg-gradient-to-br from-ice-strong to-ice" />
                <FrameArt frame={frame.id} />
              </span>
              <span className="mt-1.5 w-full truncate text-center text-[0.6875rem] font-semibold text-ink">{frame.name}</span>
              {!have && (
                <span className="absolute top-1 right-1 rounded-full bg-ink px-1.5 text-[0.5625rem] font-bold text-on-ink">
                  {formatFramePrice(frame)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Link
        href="/shop"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong hover:underline [&_svg]:size-4"
      >
        <ShoppingBag aria-hidden />
        Browse the frame shop
      </Link>
    </Section>
  );
}
