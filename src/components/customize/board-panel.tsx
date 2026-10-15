"use client";

import Link from "next/link";
import { AlignCenter, AlignLeft, AlignRight, Bold, Code2, FlipHorizontal2, ImagePlus, Italic, List, LoaderCircle, Scaling, ShoppingBag, Smile, Type } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FONT } from "@/components/about/about-board";
import { Sticker } from "@/components/about/stickers";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import {
  STICKERS,
  boardColors,
  realSize,
  titleLook,
  type Block,
  type Board,
  type BoardFont,
  type NewBlock,
  type StickerId,
  type TextualBlock,
  type TitleStyle,
} from "@/lib/customization/about";
import { FREE } from "@/lib/customization/model";
import { prepareImage, uploadArt } from "@/lib/images/prepare";
import { ChipGroup, ColorField, EffectField, FlowBadge, GradientField, Section, Slider } from "./controls";

/*
 * Left panel while the About board is open: add blocks, then edit whatever
 * is selected. New blocks land near the top-left of the empty space below
 * the last block so they're easy to find, already selected, and straight
 * (tilt 0): tilting is the artist's call, with the handle or the slider.
 */

const TEMPLATES: { label: string; block: NewBlock }[] = [
  {
    label: "Likes",
    block: { type: "list", title: "Likes", items: ["Your favorite things", "One per line"], marker: "heart", font: "sans", size: 19, align: "left", background: "#fff0f6", w: 300, h: 220, rotate: 0 },
  },
  {
    label: "DNI",
    block: { type: "list", title: "DNI", items: ["Who shouldn't interact", "And why, if you like"], marker: "cross", font: "sans", size: 19, align: "left", background: "#f1edff", w: 300, h: 200, rotate: 0 },
  },
  {
    label: "Fun facts",
    block: { type: "list", title: "Fun facts", items: ["Something surprising", "Something silly"], marker: "star", font: "sans", size: 19, align: "left", background: "#eaf6ff", w: 340, h: 200, rotate: 0 },
  },
];

const FONTS = [
  { value: "sans", label: "Clean" },
  { value: "display", label: "Bold" },
  { value: "hand", label: "Hand" },
  { value: "serif", label: "Story" },
  { value: "pixel", label: "Pixel" },
] as const;

export function BoardPanel({
  board,
  selected,
  isPaid,
  stickers,
  onAdd,
  onUpdate,
  onBoardChange,
}: {
  board: Board;
  selected: Block | null;
  isPaid: boolean;
  /** Built-in stickers plus the shop's packs this account has. */
  stickers: StickerId[];
  onAdd: (block: NewBlock) => void;
  onUpdate: (patch: Partial<Block>) => void;
  onBoardChange: (patch: Partial<Board>) => void;
}) {
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiRefusal, setAiRefusal] = useState<AiImageError | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = isPaid ? 60 : FREE.aboutBlocks;
  // Colors already on the board, offered under every color field so a new block can match.
  const palette = { label: "On your board", colors: boardColors(board) };
  const full = board.blocks.length >= 60;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const image = await prepareImage(file, 1600, { allowGif: isPaid, allowPng: true });
      URL.revokeObjectURL(image.previewUrl);
      const { path } = await uploadArt(image, "about");
      // As it is: real size, no frame (a polaroid would put paper behind a transparent PNG).
      onAdd({
        type: "image",
        image: { path, width: image.width, height: image.height },
        alt: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120),
        frame: "none",
        ...realSize(image),
        rotate: 0,
      });
    } catch (error) {
      if (error instanceof AiImageError) setAiRefusal(error);
      else setUploadError(error instanceof Error ? error.message : "That image didn't upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const add = "flex flex-col items-center gap-1 rounded-input border border-border bg-surface px-2 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 disabled:opacity-50 [&_svg]:size-5 [&_svg]:text-accent-strong";

  return (
    <>
      <Section title="Add to your board" hint={`${board.blocks.length} of ${limit} blocks${isPaid ? "" : " on Free"}`}>
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            disabled={full}
            className={add}
            onClick={() => onAdd({ type: "text", text:"Write something about you", font: "sans", size: 20, align: "left", w: 360, h: 120, rotate: 0 })}
          >
            <Type aria-hidden />
            Text
          </button>
          <button
            type="button"
            disabled={full}
            className={add}
            onClick={() => onAdd(TEMPLATES[0].block)}
          >
            <List aria-hidden />
            List
          </button>
          <button type="button" disabled={full || uploading} className={add} onClick={() => fileRef.current?.click()}>
            {uploading ? <LoaderCircle aria-hidden className="animate-spin" /> : <ImagePlus aria-hidden />}
            Image
          </button>
          <button
            type="button"
            disabled={full}
            aria-expanded={showStickers}
            className={`${add} ${showStickers ? "border-ocean bg-ocean/[0.07]" : ""}`}
            onClick={() => setShowStickers((v) => !v)}
          >
            <Smile aria-hidden />
            Sticker
          </button>
          <button
            type="button"
            disabled={full}
            className={`${add} relative`}
            onClick={() =>
              onAdd({ type: "html", html: '<div style="padding:12px;border-radius:12px;background:#fff0f6;font:600 15px system-ui">✿ Hello from HTML</div>', w: 360, h: 80, rotate: 0 })
            }
          >
            <Code2 aria-hidden />
            HTML
            {!isPaid && <FlowBadge className="absolute -top-2 -right-1.5" />}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        {uploadError && <p role="alert" className="mt-2 text-xs text-danger">{uploadError}</p>}
        <AiImageDialog error={aiRefusal} onClose={() => setAiRefusal(null)} onPickAnother={() => fileRef.current?.click()} />

        {showStickers && (
          <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-card bg-ice/60 p-2">
            {stickers.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-label={`Add ${id} sticker`}
                onClick={() => onAdd({ type: "sticker", sticker: id, color: STICKER_COLORS[i % STICKER_COLORS.length], w: 90, h: 90, rotate: 0 })}
                className="aspect-square rounded-input p-1 transition-transform hover:scale-110 hover:bg-surface"
              >
                <Sticker id={id} color={STICKER_COLORS[i % STICKER_COLORS.length]} />
              </button>
            ))}
            {stickers.length < STICKERS.length && (
              <Link
                href="/shop#aisle-stickers"
                className="col-span-8 mt-1 inline-flex items-center justify-center gap-1.5 rounded-input py-1.5 text-xs font-semibold text-ocean-ink hover:bg-surface dark:text-ocean"
              >
                <ShoppingBag aria-hidden className="size-3.5" />
                More sticker packs in the shop
              </Link>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="self-center text-xs font-medium text-muted">Quick lists:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              disabled={full}
              onClick={() => onAdd(t.block)}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-ice"
            >
              + {t.label}
            </button>
          ))}
        </div>
      </Section>

      {selected ? (
        <Inspector block={selected} isPaid={isPaid} stickers={stickers} palette={palette} onUpdate={onUpdate} />
      ) : (
        <Section title="Board" hint="Click a block on the board to edit it. Hold Alt while dragging to place freely.">
          <ColorField palette={palette}
            label="Board background"
            value={board.background === "transparent" ? undefined : board.background}
            onChange={(hex) => onBoardChange({ background: hex })}
            onClear={() => onBoardChange({ background: "transparent" })}
            swatches={CARD_SWATCHES}
          />
        </Section>
      )}
    </>
  );
}

const STICKER_COLORS = ["#ff6fa5", "#ffd166", "#5ee7ff", "#b892ff", "#7bd389", "#ff9f5a"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const input =
  "w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ocean";

function Inspector({
  block,
  isPaid,
  stickers,
  palette,
  onUpdate,
}: {
  block: Block;
  isPaid: boolean;
  stickers: StickerId[];
  palette: Palette;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const title = { text: "Text", list: "List", image: "Image", sticker: "Sticker", html: "HTML" }[block.type];
  return (
    <Section title={`Selected: ${title}`} paid={block.type === "html" && !isPaid}>
      <div className="grid gap-4">
        {(block.type === "text" || block.type === "list") && <TextualFields block={block} isPaid={isPaid} palette={palette} onUpdate={onUpdate} />}

        {block.type === "image" && (
          <>
            <Field label="Description (for screen readers)">
              <input value={block.alt} maxLength={200} onChange={(e) => onUpdate({ alt: e.target.value })} className={input} />
            </Field>
            <ChipGroup
              label="Frame"
              value={block.frame}
              isPaid={isPaid}
              onChange={(frame) => onUpdate({ frame })}
              options={[
                { value: "none", label: "None" },
                { value: "polaroid", label: "Polaroid" },
                { value: "tape", label: "Taped" },
                { value: "round", label: "Round" },
              ]}
            />
            <button
              type="button"
              onClick={() => onUpdate(realSize(block.image))}
              className="inline-flex items-center gap-1.5 justify-self-start rounded-button border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-sky/60 hover:bg-ice/60"
            >
              <Scaling aria-hidden className="size-3.5 text-accent-strong" />
              Back to real size
            </button>
          </>
        )}

        {block.type === "sticker" && (
          <>
            <div className="grid grid-cols-8 gap-1.5">
              {stickers.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-label={id}
                  aria-pressed={block.sticker === id}
                  onClick={() => onUpdate({ sticker: id as StickerId })}
                  className="aspect-square rounded-input p-1 hover:bg-ice aria-pressed:bg-ocean/10 aria-pressed:ring-2 aria-pressed:ring-ocean"
                >
                  <Sticker id={id} color={block.color} />
                </button>
              ))}
            </div>
            <ColorField palette={palette} label="Sticker color" value={block.color} onChange={(color) => onUpdate({ color })} />
          </>
        )}

        {block.type === "html" && (
          <Field label="HTML (no scripts; images must be uploaded to Artiflow)">
            <textarea
              value={block.html}
              rows={7}
              maxLength={10_000}
              spellCheck={false}
              onChange={(e) => onUpdate({ html: e.target.value })}
              className={`${input} resize-y font-mono text-xs`}
            />
          </Field>
        )}

        {(block.type === "image" || block.type === "sticker") && (
          <button
            type="button"
            aria-pressed={!!block.mirror}
            onClick={() => onUpdate({ mirror: !block.mirror })}
            className="inline-flex items-center gap-1.5 justify-self-start rounded-button border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 aria-pressed:border-ocean aria-pressed:bg-ocean/[0.07] [&_svg]:size-3.5 [&_svg]:text-accent-strong"
          >
            <FlipHorizontal2 aria-hidden />
            Mirror
          </button>
        )}

        <Slider label="Tilt" value={block.rotate} min={-45} max={45} unit="°" onChange={(rotate) => onUpdate({ rotate })} />
      </div>
    </Section>
  );
}

type Palette = { label: string; colors: string[] };

const CARD_SWATCHES = ["#ffffff", "#fff0f6", "#f1edff", "#eaf6ff", "#fff8e1", "#f1f5ec", "#1a1636", "#0b101c"];

/**
 * Text and list blocks: the title and the text under it are styled apart
 * (font, size, bold/italic, alignment, color, gradient, effect and its
 * color, like the profile name), plus the space between them.
 * The title's look stays unset until the artist touches it, so it keeps
 * following the text (1.15× its size) like older boards.
 */
function TextualFields({
  block,
  isPaid,
  palette,
  onUpdate,
}: {
  block: TextualBlock;
  isPaid: boolean;
  palette: Palette;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const look = titleLook(block);
  const setTitle = (patch: Partial<TitleStyle>) => onUpdate({ titleStyle: { ...block.titleStyle, ...patch } });
  const isList = block.type === "list";

  return (
    <>
      <Group
        label="Title"
        action={
          block.title && block.titleStyle ? (
            <button type="button" onClick={() => onUpdate({ titleStyle: undefined })} className="text-xs font-medium text-muted hover:text-ink">
              Reset
            </button>
          ) : null
        }
      >
        <input
          value={block.title ?? ""}
          maxLength={60}
          aria-label="Title"
          placeholder={isList ? "Likes, DNI…" : "Optional, like “About me”"}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={input}
        />
        {block.title && (
          <>
            <FontChips label="Title font" value={look.font} onChange={(font) => setTitle({ font })} />
            <Slider label="Size" value={Math.round(look.size)} min={10} max={120} onChange={(size) => setTitle({ size })} />
            <TypeToolbar label="Title" bold={look.bold} italic={look.italic} align={look.align} onChange={setTitle} />
            <ColorField
              palette={palette}
              label="Color"
              value={look.gradient ? undefined : look.color}
              onChange={(color) => setTitle({ color, gradient: undefined })}
              onClear={() => setTitle({ color: undefined })}
            />
            <GradientField
              label="Title gradient"
              value={look.gradient}
              isPaid={isPaid}
              palette={palette}
              onChange={(gradient) => setTitle({ gradient })}
            />
            <EffectField
              label="Title effect"
              value={look.effect}
              effectColor={look.effectColor}
              gradient={look.gradient}
              isPaid={isPaid}
              palette={palette}
              onChange={setTitle}
            />
            <Slider label="Space below" value={Math.round(look.gap)} min={0} max={200} onChange={(gap) => setTitle({ gap })} />
          </>
        )}
      </Group>

      <Group label={isList ? "Items" : "Text"}>
        {block.type === "text" ? (
          <textarea
            value={block.text}
            rows={4}
            maxLength={2000}
            aria-label="Text"
            onChange={(e) => onUpdate({ text: e.target.value })}
            className={`${input} resize-y`}
          />
        ) : (
          <textarea
            value={block.items.join("\n")}
            rows={5}
            aria-label="Items, one per line"
            placeholder="One per line"
            onChange={(e) => onUpdate({ items: e.target.value.split("\n").slice(0, 20).map((s) => s.slice(0, 120)) })}
            className={`${input} resize-y`}
          />
        )}
        <FontChips label={isList ? "Items font" : "Text font"} value={block.font} onChange={(font) => onUpdate({ font })} />
        <Slider label="Size" value={block.size} min={10} max={120} onChange={(size) => onUpdate({ size })} />
        <TypeToolbar label={isList ? "Items" : "Text"} bold={!!block.bold} italic={!!block.italic} align={block.align} onChange={onUpdate} />
        <Slider label="Line spacing" value={block.leading ?? 1.4} min={0.8} max={3} step={0.1} unit="×" onChange={(leading) => onUpdate({ leading })} />
        <ColorField
          palette={palette}
          label="Color"
          value={block.gradient ? undefined : block.color}
          onChange={(color) => onUpdate({ color, gradient: undefined })}
          onClear={() => onUpdate({ color: undefined })}
        />
        <GradientField
          label={isList ? "Items gradient" : "Text gradient"}
          value={block.gradient}
          isPaid={isPaid}
          palette={palette}
          onChange={(gradient) => onUpdate({ gradient })}
        />
        <EffectField
          label={isList ? "Items effect" : "Text effect"}
          value={block.effect}
          effectColor={block.effectColor}
          gradient={block.gradient}
          isPaid={isPaid}
          palette={palette}
          onChange={onUpdate}
        />
        {block.type === "list" && (
          <>
            <ChipGroup
              label="Bullet"
              value={block.marker}
              isPaid={isPaid}
              onChange={(marker) => onUpdate({ marker })}
              options={[
                { value: "heart", label: "♥" },
                { value: "star", label: "★" },
                { value: "check", label: "✓" },
                { value: "cross", label: "✕" },
                { value: "dot", label: "•" },
              ]}
            />
            <ColorField palette={palette}
              label="Bullet color"
              value={block.markerColor}
              onChange={(markerColor) => onUpdate({ markerColor })}
              onClear={() => onUpdate({ markerColor: undefined })}
            />
          </>
        )}
      </Group>

      <ColorField palette={palette}
        label="Card color"
        value={block.background === "transparent" ? undefined : block.background}
        onChange={(background) => onUpdate({ background })}
        onClear={() => onUpdate({ background: "transparent" })}
        swatches={CARD_SWATCHES}
      />
    </>
  );
}

/** A labelled group inside the inspector (Title, Text, Items). */
function Group({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-3 border-b border-dashed border-border pb-4">
      <p className="flex items-center justify-between text-[0.6875rem] font-bold tracking-wider text-muted uppercase">
        {label}
        {action}
      </p>
      {children}
    </div>
  );
}

/** Font choices, each written in its own face. */
function FontChips({ label, value, onChange }: { label: string; value: BoardFont; onChange: (font: BoardFont) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {FONTS.map((f) => (
        <button
          key={f.value}
          type="button"
          role="radio"
          aria-checked={value === f.value}
          onClick={() => onChange(f.value)}
          className="flex flex-col items-center gap-0.5 rounded-input border border-border bg-surface px-1 py-1.5 text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 aria-checked:border-ocean aria-checked:bg-ocean/[0.07] aria-checked:shadow-[0_0_0_1px_var(--ocean)]"
        >
          <span aria-hidden className="text-base leading-tight" style={{ fontFamily: FONT[f.value] }}>
            Aa
          </span>
          <span className="text-[0.625rem] font-medium text-muted">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

type Align = TextualBlock["align"];

const ALIGNS: { value: Align; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
];

/** Bold, italic and alignment in one row, like a text toolbar. */
function TypeToolbar({
  label,
  bold,
  italic,
  align,
  onChange,
}: {
  label: string;
  bold: boolean;
  italic: boolean;
  align: Align;
  onChange: (patch: { bold?: boolean; italic?: boolean; align?: Align }) => void;
}) {
  const tool =
    "grid size-8 place-items-center rounded-input border border-border bg-surface text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 aria-checked:border-ocean aria-checked:bg-ocean/[0.07] aria-pressed:border-ocean aria-pressed:bg-ocean/[0.07] [&_svg]:size-4";
  return (
    <div role="toolbar" aria-label={`${label} style`} className="flex items-center gap-1.5">
      <button type="button" aria-label="Bold" aria-pressed={bold} onClick={() => onChange({ bold: !bold })} className={tool}>
        <Bold aria-hidden />
      </button>
      <button type="button" aria-label="Italic" aria-pressed={italic} onClick={() => onChange({ italic: !italic })} className={tool}>
        <Italic aria-hidden />
      </button>
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <div role="radiogroup" aria-label={`${label} alignment`} className="flex gap-1.5">
        {ALIGNS.map(({ value, label: name, Icon }) => (
          <button key={value} type="button" role="radio" aria-label={name} aria-checked={align === value} onClick={() => onChange({ align: value })} className={tool}>
            <Icon aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
