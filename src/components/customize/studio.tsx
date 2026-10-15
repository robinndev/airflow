"use client";

import Link from "next/link";
import { ArrowUpRight, Check, LoaderCircle, Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveCustomization, type SaveResult } from "@/app/(site)/customize/actions";
import { buttonClasses } from "@/components/ui/button";
import { FREE, paidFieldsUsed, type Customization } from "@/lib/customization/model";
import { boardPaidFeatures, type Block, type Board, type NewBlock, type StickerId } from "@/lib/customization/about";
import { canvasData, canvasStyle } from "@/lib/customization/style";
import { BoardEditor } from "./board-editor";
import { BoardPanel } from "./board-panel";
import { CssPanel } from "./css-panel";
import { ButtonsPanel, FramePanel, NamePanel, ThemePanel } from "./design-panels";
import { FlowPlusBar } from "./flow-plus-bar";
import { ProfilePreview, type PreviewProfile } from "./profile-preview";
import { isTextField, useShortcutLabel } from "./shortcuts";
import { TABS, type TabId } from "./tabs";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The first spot (reading order) where a w×h block doesn't overlap anything; else below everything. */
function freeSpot(board: Board, w: number, h: number) {
  const overlaps = (x: number, y: number) =>
    board.blocks.some((b) => x < b.x + b.w + 10 && x + w + 10 > b.x && y < b.y + b.h + 10 && y + h + 10 > b.y);
  for (let y = 40; y + h <= board.height - 20; y += 40) {
    for (let x = 40; x + w <= 960; x += 40) if (!overlaps(x, y)) return { x, y };
  }
  return { x: 40, y: Math.max(40, ...board.blocks.map((b) => b.y + b.h + 30)) };
}
const newId = () => `b-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

/**
 * The customizer. Everything previews live — including Flow+ options on a
 * free account (try before you buy); saving checks the plan server-side.
 */
export function Studio({
  profile,
  initialCustom,
  initialBoard,
  isPaid,
  owned,
  stickers,
  initialTab,
}: {
  profile: PreviewProfile;
  initialCustom: Customization;
  initialBoard: Board;
  isPaid: boolean;
  owned: string[];
  /** Stickers this account can put on the board (built-ins + owned packs). */
  stickers: StickerId[];
  initialTab: TabId;
}) {
  const [custom, setCustom] = useState(initialCustom);
  const [board, setBoard] = useState(initialBoard);
  const [saved, setSaved] = useState({ custom: initialCustom, board: initialBoard });
  const [tab, setTab] = useState<TabId>(initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The CSS helper points at parts of the preview.
  const [highlight, setHighlight] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [saving, startSaving] = useTransition();
  const shortcut = useShortcutLabel();

  // Board history: one entry per finished gesture or edit.
  const boardRef = useRef(board);
  const history = useRef<Board[]>([initialBoard]);
  const cursor = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistory = useCallback(() => {
    setCanUndo(cursor.current > 0);
    setCanRedo(cursor.current < history.current.length - 1);
  }, []);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const commit = useCallback(() => {
    const current = boardRef.current;
    if (same(current, history.current[cursor.current])) return;
    history.current = [...history.current.slice(0, cursor.current + 1), current].slice(-80);
    cursor.current = history.current.length - 1;
    syncHistory();
  }, [syncHistory]);

  const changeBoard = useCallback((next: Board, record = false) => {
    boardRef.current = next;
    setBoard(next);
    setResult(null);
    if (record) commit();
  }, [commit]);

  const travel = useCallback((step: -1 | 1) => {
    // An edit still in progress (a slider that still has focus) becomes its own step first.
    commit();
    const target = cursor.current + step;
    if (target < 0 || target >= history.current.length) return;
    cursor.current = target;
    boardRef.current = history.current[target];
    setBoard(history.current[target]);
    syncHistory();
  }, [commit, syncHistory]);

  const dirty = !same(custom, saved.custom) || !same(board, saved.board);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (tab !== "about") return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || isTextField(event.target)) return;
      const key = event.key.toLowerCase();
      // ⌘Z / Ctrl+Z undo; ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo.
      if (key === "z" || key === "y") {
        event.preventDefault();
        travel(key === "y" || event.shiftKey ? 1 : -1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, travel]);

  function changeCustom(next: Customization) {
    setCustom(next);
    setResult(null);
  }

  /* -------------------------------------------------------- board edits */

  function addBlock(block: NewBlock) {
    const { x, y } = freeSpot(board, block.w, block.h);
    const z = Math.max(0, ...board.blocks.map((b) => b.z)) + 1;
    const created = { ...block, id: newId(), x, y, z } as Block;
    changeBoard({ ...board, height: Math.max(board.height, y + block.h + 40), blocks: [...board.blocks, created] }, true);
    setSelectedId(created.id);
  }

  function updateSelected(patch: Partial<Block>) {
    if (!selectedId) return;
    changeBoard({ ...board, blocks: board.blocks.map((b) => (b.id === selectedId ? ({ ...b, ...patch } as Block) : b)) });
  }

  function duplicate(id: string) {
    const source = board.blocks.find((b) => b.id === id);
    if (!source || board.blocks.length >= 60) return;
    const copy = { ...source, id: newId(), x: source.x + 30, y: source.y + 30, z: source.z + 1 } as Block;
    changeBoard({ ...board, blocks: [...board.blocks, copy] }, true);
    setSelectedId(copy.id);
  }

  function remove(id: string) {
    changeBoard({ ...board, blocks: board.blocks.filter((b) => b.id !== id) }, true);
    setSelectedId(null);
  }

  function layer(id: string, where: "front" | "back") {
    const zs = board.blocks.map((b) => b.z);
    const z = where === "front" ? Math.min(999, Math.max(...zs) + 1) : Math.max(0, Math.min(...zs) - 1);
    changeBoard({ ...board, blocks: board.blocks.map((b) => (b.id === id ? { ...b, z } : b)) }, true);
  }

  /* --------------------------------------------------------------- save */

  const needsPlan = isPaid ? [] : [...paidFieldsUsed(custom), ...boardPaidFeatures(board, FREE.aboutBlocks)];

  function save() {
    startSaving(async () => {
      const res = await saveCustomization({ customization: custom, board });
      setResult(res);
      if (res.ok) setSaved({ custom, board });
    });
  }

  function discard() {
    setCustom(saved.custom);
    changeBoard(saved.board, true);
    setSelectedId(null);
    setResult(null);
  }

  const selected = board.blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-24 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Your page</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">Make it yours</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveStatus dirty={dirty} saving={saving} result={result} />
          <Link href={`/${profile.handle}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            View page
            <ArrowUpRight aria-hidden />
          </Link>
          <button type="button" disabled={!dirty || saving} onClick={discard} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Discard
          </button>
          <button type="button" disabled={!dirty || saving} onClick={save} className={buttonClasses({ size: "sm", className: "min-w-24" })}>
            {saving ? <LoaderCircle aria-hidden className="animate-spin" /> : <Check aria-hidden />}
            Save
          </button>
        </div>
      </div>

      {!isPaid && <FlowPlusBar tab={tab} previewing={needsPlan} />}

      {result && !result.ok && !result.needsPlan && (
        <p role="alert" className="mt-4 rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
          {result.error}
        </p>
      )}

      <nav aria-label="Customize" className="mt-6 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div role="tablist" className="inline-flex gap-1 rounded-full bg-ice p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setSelectedId(null);
                setHighlight(null);
              }}
              className="h-9 rounded-full px-4 text-sm font-semibold whitespace-nowrap text-muted transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-soft"
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Leaving a field in the panel records one undo step for the board. */}
        <aside
          onBlur={tab === "about" ? commit : undefined}
          className="overflow-hidden rounded-panel border border-border bg-surface shadow-soft lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          {tab === "theme" && <ThemePanel custom={custom} isPaid={isPaid} onChange={changeCustom} />}
          {tab === "name" && <NamePanel custom={custom} isPaid={isPaid} onChange={changeCustom} displayName={profile.displayName} />}
          {tab === "buttons" && <ButtonsPanel custom={custom} isPaid={isPaid} onChange={changeCustom} />}
          {tab === "frame" && <FramePanel custom={custom} isPaid={isPaid} onChange={changeCustom} owned={owned} />}
          {tab === "css" && <CssPanel custom={custom} isPaid={isPaid} onChange={changeCustom} onHighlight={setHighlight} />}
          {tab === "about" && (
            <BoardPanel
              board={board}
              selected={selected}
              isPaid={isPaid}
              stickers={stickers}
              onAdd={addBlock}
              onUpdate={updateSelected}
              onBoardChange={(patch) => changeBoard({ ...board, ...patch }, true)}
            />
          )}
        </aside>

        <div className="min-w-0">
          {tab === "about" ? (
            // The board is edited on the profile's own canvas, in its palette.
            <div
              data-profile-canvas={`preview-${profile.handle}`}
              {...canvasData(custom)}
              style={canvasStyle(custom)}
              className="rounded-panel border border-border p-4 shadow-lift sm:p-6"
            >
              {/* Undo / Redo float down a long board with you (no height of its own; it sits beside the hint at rest). */}
              <div className="sticky top-20 z-20 flex h-0 justify-end">
                <div role="toolbar" aria-label="Board history" className="flex h-10 items-center gap-0.5 rounded-full border border-border bg-surface/95 p-1 shadow-soft backdrop-blur">
                  <button
                    type="button"
                    title={`Undo (${shortcut("Z")})`}
                    aria-keyshortcuts="Control+Z Meta+Z"
                    disabled={!canUndo}
                    onClick={() => travel(-1)}
                    className={historyButton}
                  >
                    <Undo2 aria-hidden />
                    Undo
                  </button>
                  <span aria-hidden className="h-5 w-px bg-border" />
                  <button
                    type="button"
                    title={`Redo (${shortcut("Z", { shift: true })})`}
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                    disabled={!canRedo}
                    onClick={() => travel(1)}
                    className={historyButton}
                  >
                    <Redo2 aria-hidden />
                    Redo
                  </button>
                </div>
              </div>
              <p className="mb-3 flex min-h-10 items-center pr-48 text-sm text-muted">Drag to move · corner to resize · top handle to tilt</p>
              <BoardEditor
                board={board}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={(next) => changeBoard(next)}
                onCommit={commit}
                onDuplicate={duplicate}
                onDelete={remove}
                onLayer={layer}
              />
            </div>
          ) : (
            <ProfilePreview profile={profile} custom={custom} highlight={tab === "css" ? highlight : null} />
          )}
        </div>
      </div>
    </div>
  );
}

const historyButton =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-ice disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4";

function SaveStatus({ dirty, saving, result }: { dirty: boolean; saving: boolean; result: SaveResult | null }) {
  const text = saving ? "Saving…" : dirty ? "Unsaved changes" : result?.ok ? "Saved — live on your page" : "All changes saved";
  return (
    <p role="status" aria-live="polite" className={`mr-1 text-sm ${dirty ? "font-semibold text-ink" : "text-muted"}`}>
      {dirty && !saving && <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-sky align-middle" />}
      {text}
    </p>
  );
}
