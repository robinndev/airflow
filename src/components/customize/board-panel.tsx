"use client";

import { Code2, ImagePlus, List, LoaderCircle, Smile, Type } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Sticker } from "@/components/about/stickers";
import { STICKERS, type Block, type Board, type NewBlock, type StickerId } from "@/lib/customization/about";
import { FREE } from "@/lib/customization/model";
import { prepareImage, uploadArt } from "@/lib/images/prepare";
import { ChipGroup, ColorField, FlowBadge, Section, Slider } from "./controls";

/*
 * Left panel while the About board is open: add blocks, then edit whatever
 * is selected. New blocks land near the top-left of the empty space below
 * the last block so they're easy to find, already selected.
 */

const TEMPLATES: { label: string; block: NewBlock }[] = [
  {
    label: "Likes",
    block: { type: "list", title: "Likes", items: ["Your favorite things", "One per line"], marker: "heart", font: "sans", size: 19, align: "left", background: "#fff0f6", w: 300, h: 220, rotate: -1 },
  },
  {
    label: "DNI",
    block: { type: "list", title: "DNI", items: ["Who shouldn't interact", "And why, if you like"], marker: "cross", font: "sans", size: 19, align: "left", background: "#f1edff", w: 300, h: 200, rotate: 1 },
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
  onAdd,
  onUpdate,
  onBoardChange,
}: {
  board: Board;
  selected: Block | null;
  isPaid: boolean;
  onAdd: (block: NewBlock) => void;
  onUpdate: (patch: Partial<Block>) => void;
  onBoardChange: (patch: Partial<Board>) => void;
}) {
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = isPaid ? 60 : FREE.aboutBlocks;
  const full = board.blocks.length >= 60;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const image = await prepareImage(file, 1600, { allowGif: isPaid });
      URL.revokeObjectURL(image.previewUrl);
      const path = await uploadArt(image, "about");
      const w = 300;
      onAdd({
        type: "image",
        image: { path, width: image.width, height: image.height },
        alt: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120),
        frame: "polaroid",
        w,
        h: Math.round((w * image.height) / image.width) + 50,
        rotate: 0,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "That image didn't upload. Try again.");
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
            onClick={() => onAdd({ type: "text", text: "Write something about you", font: "sans", size: 20, align: "left", w: 360, h: 120, rotate: 0 })}
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

        {showStickers && (
          <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-card bg-ice/60 p-2">
            {STICKERS.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-label={`Add ${id} sticker`}
                onClick={() => onAdd({ type: "sticker", sticker: id, color: STICKER_COLORS[i % STICKER_COLORS.length], w: 90, h: 90, rotate: (i % 3) * 6 - 6 })}
                className="aspect-square rounded-input p-1 transition-transform hover:scale-110 hover:bg-surface"
              >
                <Sticker id={id} color={STICKER_COLORS[i % STICKER_COLORS.length]} />
              </button>
            ))}
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
        <Inspector block={selected} isPaid={isPaid} onUpdate={onUpdate} />
      ) : (
        <Section title="Board" hint="Click a block on the board to edit it. Hold Alt while dragging to place freely.">
          <ColorField
            label="Board background"
            value={board.background === "transparent" ? undefined : board.background}
            onChange={(hex) => onBoardChange({ background: hex })}
            onClear={() => onBoardChange({ background: "transparent" })}
            swatches={["#ffffff", "#fff0f6", "#f1edff", "#eaf6ff", "#fff8e1", "#f1f5ec", "#1a1636", "#0b101c"]}
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

function Inspector({ block, isPaid, onUpdate }: { block: Block; isPaid: boolean; onUpdate: (patch: Partial<Block>) => void }) {
  const title = { text: "Text", list: "List", image: "Image", sticker: "Sticker", html: "HTML" }[block.type];
  return (
    <Section title={`Selected: ${title}`} paid={block.type === "html" && !isPaid}>
      <div className="grid gap-4">
        {block.type === "text" && (
          <Field label="Text">
            <textarea
              value={block.text}
              rows={4}
              maxLength={2000}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className={`${input} resize-y`}
            />
          </Field>
        )}

        {block.type === "list" && (
          <>
            <Field label="Title">
              <input value={block.title} maxLength={60} onChange={(e) => onUpdate({ title: e.target.value })} className={input} />
            </Field>
            <Field label="Items (one per line)">
              <textarea
                value={block.items.join("\n")}
                rows={5}
                onChange={(e) => onUpdate({ items: e.target.value.split("\n").slice(0, 20).map((s) => s.slice(0, 120)) })}
                className={`${input} resize-y`}
              />
            </Field>
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
          </>
        )}

        {(block.type === "text" || block.type === "list") && (
          <>
            <ChipGroup label="Font" value={block.font} isPaid={isPaid} onChange={(font) => onUpdate({ font })} options={FONTS.map((f) => ({ ...f }))} />
            <Slider label="Size" value={block.size} min={10} max={120} onChange={(size) => onUpdate({ size })} />
            <ChipGroup
              label="Align"
              value={block.align}
              isPaid={isPaid}
              onChange={(align) => onUpdate({ align })}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
            <ColorField label="Text color" value={block.color} onChange={(color) => onUpdate({ color })} onClear={() => onUpdate({ color: undefined })} />
            <ColorField
              label="Card color"
              value={block.background === "transparent" ? undefined : block.background}
              onChange={(background) => onUpdate({ background })}
              onClear={() => onUpdate({ background: "transparent" })}
              swatches={["#ffffff", "#fff0f6", "#f1edff", "#eaf6ff", "#fff8e1", "#f1f5ec", "#1a1636", "#0b101c"]}
            />
          </>
        )}

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
          </>
        )}

        {block.type === "sticker" && (
          <>
            <div className="grid grid-cols-8 gap-1.5">
              {STICKERS.map((id) => (
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
            <ColorField label="Sticker color" value={block.color} onChange={(color) => onUpdate({ color })} />
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

        <Slider label="Tilt" value={block.rotate} min={-45} max={45} unit="°" onChange={(rotate) => onUpdate({ rotate })} />
      </div>
    </Section>
  );
}
