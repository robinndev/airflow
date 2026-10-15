"use client";

import { ArrowDownToLine, ArrowUpToLine, Copy, FlipHorizontal2, GripHorizontal, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BlockView } from "@/components/about/about-board";
import {
  BOARD_MAX_HEIGHT,
  BOARD_MIN_HEIGHT,
  BOARD_WIDTH,
  GRID,
  type Block,
  type Board,
} from "@/lib/customization/about";
import { useShortcutLabel } from "./shortcuts";

/*
 * Drag-and-drop board editor. The surface uses the same board units as the
 * public board (1000 across, scaled with container units), so pointer deltas
 * are converted px → units with the surface's current width. While a gesture
 * runs, changes stream through `onChange` (no history); `onCommit` marks the
 * end so the studio can push one undo step per gesture.
 */

type Gesture =
  | { mode: "move"; id: string; x0: number; y0: number; orig: Block }
  | { mode: "resize"; id: string; x0: number; y0: number; orig: Block }
  | { mode: "rotate"; id: string; cx: number; cy: number; orig: Block }
  | { mode: "height"; y0: number; orig: number };

const snap = (value: number, free: boolean) => (free ? Math.round(value) : Math.round(value / GRID) * GRID);

/** Blocks may hang off an edge by up to half their width, never further (the board's limits). */
const clampX = (x: number, w: number) => Math.min(BOARD_WIDTH - w / 2, Math.max(-w / 2, x));
const clampY = (y: number, h: number, height: number) => Math.min(height - h / 2, Math.max(-h / 2, -100, y));
const keepsAspect = (block: Block) => block.type === "sticker" || block.type === "image";

export function BoardEditor({
  board,
  selectedId,
  onSelect,
  onChange,
  onCommit,
  onDuplicate,
  onDelete,
  onLayer,
}: {
  board: Board;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (board: Board) => void;
  onCommit: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onLayer: (id: string, where: "front" | "back") => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef(board);
  const gesture = useRef<Gesture | null>(null);
  const moved = useRef(false);
  // The listener attached for the running gesture (renders mid-drag create new closures).
  const activeMove = useRef<((event: PointerEvent) => void) | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const unitsPerPx = () => BOARD_WIDTH / (surfaceRef.current?.getBoundingClientRect().width || BOARD_WIDTH);

  function updateBlock(id: string, patch: Partial<Block>) {
    const current = boardRef.current;
    onChange({ ...current, blocks: current.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) });
  }

  function startGesture(event: ReactPointerEvent, next: Gesture) {
    event.preventDefault();
    event.stopPropagation();
    gesture.current = next;
    moved.current = false;
    activeMove.current = onPointerMove;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endGesture, { once: true });
    window.addEventListener("pointercancel", endGesture, { once: true });
  }

  function onPointerMove(event: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    moved.current = true;
    const k = unitsPerPx();
    const free = event.altKey;

    if (g.mode === "move") {
      updateBlock(g.id, {
        x: Math.round(clampX(snap(g.orig.x + (event.clientX - g.x0) * k, free), g.orig.w)),
        y: Math.round(clampY(snap(g.orig.y + (event.clientY - g.y0) * k, free), g.orig.h, boardRef.current.height)),
      });
    } else if (g.mode === "resize") {
      let w = Math.max(20, snap(g.orig.w + (event.clientX - g.x0) * k, free));
      let h = Math.max(20, snap(g.orig.h + (event.clientY - g.y0) * k, free));
      if (keepsAspect(g.orig) !== event.shiftKey) {
        const ratio = g.orig.h / g.orig.w;
        h = Math.max(20, Math.round(w * ratio));
        if (h > 2000) {
          h = 2000;
          w = Math.round(h / ratio);
        }
      }
      updateBlock(g.id, { w: Math.min(w, BOARD_WIDTH), h: Math.min(h, 2000) });
    } else if (g.mode === "rotate") {
      const deg = (Math.atan2(event.clientY - g.cy, event.clientX - g.cx) * 180) / Math.PI + 90;
      const normalized = ((deg + 540) % 360) - 180;
      updateBlock(g.id, { rotate: event.shiftKey ? Math.round(normalized) : Math.round(normalized / 5) * 5 });
    } else {
      const height = Math.round((g.orig + (event.clientY - g.y0) * k) / GRID) * GRID;
      onChange({ ...boardRef.current, height: Math.min(BOARD_MAX_HEIGHT, Math.max(BOARD_MIN_HEIGHT, height)) });
    }
  }

  function endGesture() {
    if (activeMove.current) window.removeEventListener("pointermove", activeMove.current);
    activeMove.current = null;
    gesture.current = null;
    if (moved.current) onCommit();
  }

  useEffect(
    () => () => {
      if (activeMove.current) window.removeEventListener("pointermove", activeMove.current);
    },
    [],
  );

  function onKeyDown(event: KeyboardEvent) {
    if (!selectedId || (event.target as HTMLElement).closest("input, textarea, select")) return;
    const block = board.blocks.find((b) => b.id === selectedId);
    if (!block) return;
    const step = event.shiftKey ? GRID * 2 : 2;
    const nudge = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (nudge) {
      event.preventDefault();
      updateBlock(block.id, {
        x: Math.round(clampX(block.x + nudge[0], block.w)),
        y: Math.round(clampY(block.y + nudge[1], block.h, board.height)),
      });
      onCommit();
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete(block.id);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      onDuplicate(block.id);
    } else if (event.key === "Escape") {
      onSelect(null);
    }
  }

  const selected = board.blocks.find((b) => b.id === selectedId);

  return (
    <div className="about-board select-none">
      <div
        ref={surfaceRef}
        tabIndex={0}
        role="application"
        aria-label="About board editor. Click a block to select it; arrows nudge, Delete removes, Cmd or Ctrl+D duplicates, Cmd or Ctrl+Z undoes."
        onKeyDown={onKeyDown}
        onPointerDown={() => onSelect(null)}
        className="about-board-inner relative touch-none overflow-hidden rounded-panel border border-dashed border-border outline-none focus-visible:border-ocean"
        style={{
          height: `calc(var(--u) * ${board.height})`,
          backgroundColor: board.background === "transparent" ? undefined : board.background,
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--ink) 14%, transparent) calc(var(--u) * 1.4), transparent calc(var(--u) * 1.6))",
          backgroundSize: `calc(var(--u) * ${GRID * 4}) calc(var(--u) * ${GRID * 4})`,
        }}
      >
        {board.blocks.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center text-sm text-muted">
            Your board is empty. Add text, lists, images and stickers from the panel — then drag them anywhere.
          </p>
        )}

        {board.blocks.map((block) => {
          const isSelected = block.id === selectedId;
          return (
            <div
              key={block.id}
              data-block={block.type}
              onPointerDown={(e) => {
                onSelect(block.id);
                surfaceRef.current?.focus({ preventScroll: true });
                startGesture(e, { mode: "move", id: block.id, x0: e.clientX, y0: e.clientY, orig: block });
              }}
              className={`group/block absolute cursor-grab active:cursor-grabbing ${
                isSelected ? "outline-2 outline-offset-2 outline-ocean" : "hover:outline-1 hover:outline-offset-2 hover:outline-ocean/50"
              }`}
              style={{
                left: `calc(var(--u) * ${block.x})`,
                top: `calc(var(--u) * ${block.y})`,
                width: `calc(var(--u) * ${block.w})`,
                height: `calc(var(--u) * ${block.h})`,
                rotate: `${block.rotate}deg`,
                zIndex: isSelected ? 900 : block.z,
                outlineStyle: isSelected ? "solid" : undefined,
              }}
            >
              {/* Content never eats the pointer (iframes and images would). */}
              <div className="pointer-events-none size-full">
                <BlockView block={block} scaled />
              </div>

              {isSelected && (
                <>
                  <button
                    type="button"
                    aria-label="Resize"
                    onPointerDown={(e) =>
                      startGesture(e, { mode: "resize", id: block.id, x0: e.clientX, y0: e.clientY, orig: block })
                    }
                    className="absolute -right-2.5 -bottom-2.5 size-5 cursor-nwse-resize rounded-full border-2 border-white bg-ocean shadow-lift"
                  />
                  <button
                    type="button"
                    aria-label="Rotate"
                    onPointerDown={(e) => {
                      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      startGesture(e, {
                        mode: "rotate",
                        id: block.id,
                        cx: rect.left + rect.width / 2,
                        cy: rect.top + rect.height / 2,
                        orig: block,
                      });
                    }}
                    className="absolute -top-9 left-1/2 grid size-6 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-ocean text-white shadow-lift"
                  >
                    <RotateCw aria-hidden className="size-3" />
                  </button>
                </>
              )}
            </div>
          );
        })}

        {selected && (
          <BlockToolbar
            block={selected}
            onDuplicate={() => onDuplicate(selected.id)}
            onDelete={() => onDelete(selected.id)}
            onLayer={(where) => onLayer(selected.id, where)}
            onMirror={
              selected.type === "image" || selected.type === "sticker"
                ? () => {
                    updateBlock(selected.id, { mirror: !selected.mirror });
                    onCommit();
                  }
                : undefined
            }
          />
        )}
      </div>

      <button
        type="button"
        aria-label="Drag to make the board taller or shorter"
        onPointerDown={(e) => startGesture(e, { mode: "height", y0: e.clientY, orig: board.height })}
        className="mx-auto mt-1.5 flex h-6 w-28 cursor-ns-resize items-center justify-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
      >
        <GripHorizontal aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/** Quick actions floating above the selected block. */
function BlockToolbar({
  block,
  onDuplicate,
  onDelete,
  onLayer,
  onMirror,
}: {
  block: Block;
  onDuplicate: () => void;
  onDelete: () => void;
  onLayer: (where: "front" | "back") => void;
  /** Images and stickers only. */
  onMirror?: () => void;
}) {
  const shortcut = useShortcutLabel();
  const button =
    "grid size-8 place-items-center rounded-full text-ink transition-colors hover:bg-ice [&_svg]:size-4";
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-[950] flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-lift"
      style={{
        // Kept inside the board even when the block hangs off an edge.
        left: `clamp(6rem, calc(var(--u) * ${block.x + block.w / 2}), calc(100% - 6rem))`,
        top: `max(4px, calc(var(--u) * ${block.y} - 5.25rem))`,
      }}
    >
      <button type="button" aria-label="Bring to front" title="Bring to front" onClick={() => onLayer("front")} className={button}>
        <ArrowUpToLine aria-hidden />
      </button>
      <button type="button" aria-label="Send to back" title="Send to back" onClick={() => onLayer("back")} className={button}>
        <ArrowDownToLine aria-hidden />
      </button>
      {onMirror && (
        <button
          type="button"
          aria-label="Mirror"
          aria-pressed={"mirror" in block && !!block.mirror}
          title="Mirror"
          onClick={onMirror}
          className={`${button} aria-pressed:bg-ocean/10 aria-pressed:text-ocean-ink dark:aria-pressed:text-ocean`}
        >
          <FlipHorizontal2 aria-hidden />
        </button>
      )}
      <button type="button" aria-label="Duplicate" title={`Duplicate (${shortcut("D")})`} onClick={onDuplicate} className={button}>
        <Copy aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Delete"
        title="Delete"
        onClick={onDelete}
        className={`${button} text-danger hover:bg-danger/10`}
      >
        <Trash2 aria-hidden />
      </button>
    </div>
  );
}
