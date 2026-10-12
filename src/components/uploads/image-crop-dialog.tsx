"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { CropRect } from "@/lib/images/prepare";

export type CropShape = "avatar" | "banner";

/**
 * The window each shape is cut to. The cover is shown full-bleed at
 * clamp(15rem, 30vw, 24rem) tall, which is 10:3 on most desktops; phones show
 * its middle (a 390px phone sees about half the width).
 */
const SHAPE: Record<CropShape, { aspect: number; title: string; minSide: number }> = {
  avatar: { aspect: 1, title: "Frame your picture", minSide: 64 },
  banner: { aspect: 10 / 3, title: "Frame your cover", minSide: 320 },
};
const PHONE_SHARE = 0.49;
const MAX_ZOOM = 6;

type View = { zoom: number; cx: number; cy: number };
type Size = { width: number; height: number };

/** The crop (in the image's pixels) for a zoom and center; pure, so the editor and the previews agree. */
function cropOf(image: Size, aspect: number, { zoom, cx, cy }: View): CropRect {
  const width = Math.min(image.width, image.height * aspect) / zoom;
  const height = width / aspect;
  const x = Math.min(Math.max(cx - width / 2, 0), image.width - width);
  const y = Math.min(Math.max(cy - height / 2, 0), image.height - height);
  return { x, y, width, height };
}

/** Keeps the center where the crop stays inside the image. */
function settle(image: Size, aspect: number, view: View, maxZoom: number): View {
  const zoom = Math.min(Math.max(view.zoom, 1), maxZoom);
  const crop = cropOf(image, aspect, { ...view, zoom });
  return { zoom, cx: crop.x + crop.width / 2, cy: crop.y + crop.height / 2 };
}

/**
 * Zoom and reposition a new profile picture or cover before it uploads, like
 * Discord's "Edit image": the window is cut out of a mat, the rest of the
 * picture shows dimmed around it. Drag (or arrow keys) to move; the slider,
 * the wheel, a pinch or +/− to zoom. Hands back the crop in the original's
 * pixels; prepareImage() cuts it out (and never enlarges it).
 */
export function ImageCropDialog({
  file,
  shape,
  onCancel,
  onApply,
}: {
  file: File | null;
  shape: CropShape;
  onCancel: () => void;
  onApply: (file: File, crop: CropRect) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState<{ file: File; url: string; size: Size } | null>(null);

  // Load the picked file (its natural size drives every number below), then open.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Image();
    let alive = true;
    probe.onload = () => {
      if (!alive) return;
      setSource({ file, url, size: { width: probe.naturalWidth, height: probe.naturalHeight } });
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    };
    probe.onerror = () => alive && onCancel();
    probe.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file, onCancel]);

  const titleId = `crop-${shape}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        setSource(null);
        onCancel();
      }}
      className={`m-auto ${shape === "banner" ? "w-[min(46rem,calc(100vw-1.5rem))]" : "w-[min(27rem,calc(100vw-1.5rem))]"} overflow-hidden rounded-panel bg-surface p-0 text-ink shadow-lift outline-none transition-[opacity,scale] duration-200 backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] starting:open:scale-95 starting:open:opacity-0`}
    >
      {source && (
        <Cropper
          key={source.url}
          source={source}
          shape={shape}
          titleId={titleId}
          onCancel={() => dialogRef.current?.close()}
          onApply={(crop) => {
            const picked = source.file;
            setSource(null);
            dialogRef.current?.close();
            onApply(picked, crop);
          }}
        />
      )}
    </dialog>
  );
}

function Cropper({
  source,
  shape,
  titleId,
  onCancel,
  onApply,
}: {
  source: { url: string; size: Size };
  shape: CropShape;
  titleId: string;
  onCancel: () => void;
  onApply: (crop: CropRect) => void;
}) {
  const { aspect, title, minSide } = SHAPE[shape];
  const image = source.size;
  const fullWidth = Math.min(image.width, image.height * aspect);
  // Zoom stops before the window holds fewer pixels than the slot needs; tiny images don't zoom.
  const maxZoom = Math.max(1, Math.min(MAX_ZOOM, fullWidth / minSide));
  const start: View = { zoom: 1, cx: image.width / 2, cy: image.height / 2 };
  const [view, setView] = useState<View>(start);
  const [frameWidth, setFrameWidth] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const crop = cropOf(image, aspect, view);
  const scale = frameWidth / crop.width; // screen px per image px

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const update = (next: (current: View) => View) => setView((current) => settle(image, aspect, next(current), maxZoom));
  const pan = (dx: number, dy: number) => update((v) => ({ ...v, cx: v.cx - dx / scale, cy: v.cy - dy / scale }));
  const zoomBy = (factor: number) => update((v) => ({ ...v, zoom: v.zoom * factor }));

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((v) => settle(image, aspect, { ...v, zoom: v.zoom * Math.exp(-event.deltaY * 0.0015) }, maxZoom));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [image, aspect, maxZoom]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const all = pointers.current;
    const before = all.get(event.pointerId);
    if (!before) return;
    const now = { x: event.clientX, y: event.clientY };
    if (all.size === 2) {
      // Pinch: zoom by how much the two fingers spread.
      const other = [...all.entries()].find(([id]) => id !== event.pointerId)![1];
      const spread = (a: { x: number; y: number }) => Math.hypot(a.x - other.x, a.y - other.y) || 1;
      zoomBy(spread(now) / spread(before));
    } else {
      pan(now.x - before.x, now.y - before.y);
    }
    all.set(event.pointerId, now);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[event.key]) pan(...moves[event.key]);
    else if (event.key === "+" || event.key === "=") zoomBy(1.1);
    else if (event.key === "-") zoomBy(1 / 1.1);
    else return;
    event.preventDefault();
  }

  const percent = Math.round(view.zoom * 100);

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="font-display text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">Drag to move it. Zoom with the slider, the wheel or a pinch.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      {/* The mat: the picture spills past the window, dimmed; only the window is kept. */}
      <div
        ref={stageRef}
        tabIndex={0}
        role="application"
        aria-label={`${title}. Arrow keys move the picture, plus and minus zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="mat-grid relative cursor-grab touch-none overflow-hidden rounded-card bg-canvas p-7 outline-none select-none focus-visible:ring-2 focus-visible:ring-ocean active:cursor-grabbing sm:p-9"
      >
        <div
          ref={frameRef}
          className={`relative mx-auto ${shape === "avatar" ? "w-full max-w-72" : "w-full"}`}
          style={{ aspectRatio: aspect }}
        >
          {frameWidth > 0 && (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, positioned by hand.
            <img
              src={source.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
              style={{
                width: image.width * scale,
                height: image.height * scale,
                transform: `translate(${-crop.x * scale}px, ${-crop.y * scale}px)`,
              }}
            />
          )}
          {/* The window: everything outside it is dimmed by its shadow. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ring-2 ring-white/90 ${shape === "avatar" ? "rounded-full" : "rounded-[6px]"}`}
            style={{ boxShadow: "0 0 0 100vmax color-mix(in oklab, var(--scrim) 62%, transparent)" }}
          />
          {shape === "banner" && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 border-x border-dashed border-white/80"
              style={{ left: `${((1 - PHONE_SHARE) / 2) * 100}%`, right: `${((1 - PHONE_SHARE) / 2) * 100}%` }}
            >
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-scrim/60 px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap text-white">
                Phones show this part
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-64 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.15)}
            disabled={view.zoom <= 1}
            aria-label="Zoom out"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <input
            type="range"
            aria-label="Zoom"
            aria-valuetext={`${percent}%`}
            min={1}
            max={maxZoom}
            step={0.01}
            value={view.zoom}
            disabled={maxZoom <= 1}
            onChange={(e) => update((v) => ({ ...v, zoom: Number(e.target.value) }))}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-ocean disabled:cursor-not-allowed disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            disabled={view.zoom >= maxZoom}
            aria-label="Zoom in"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
          <span className="w-11 text-right text-xs font-semibold text-muted tabular-nums">{percent}%</span>
        </div>
        {shape === "avatar" && <AvatarPreviews url={source.url} image={image} crop={crop} />}
      </div>

      {maxZoom <= 1 && (
        <p className="-mt-2 text-xs text-muted">This picture is small, so it goes up at its real size: zooming in would only blur it.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setView(start)}
          className="inline-flex items-center gap-1.5 rounded-button px-2 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <RotateCcw aria-hidden className="size-4" />
          Reset
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={buttonClasses({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" onClick={() => onApply(crop)} className={buttonClasses({ variant: "primary" })}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/** The picture as it'll look at the sizes people actually see it: profile and comments. */
function AvatarPreviews({ url, image, crop }: { url: string; image: Size; crop: CropRect }) {
  return (
    <div className="ml-auto flex items-center gap-2" aria-hidden>
      {[48, 28].map((size) => {
        const scale = size / crop.width;
        return (
          <span key={size} className="relative shrink-0 overflow-hidden rounded-full bg-ice ring-2 ring-surface shadow-soft" style={{ width: size, height: size }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img
              src={url}
              alt=""
              className="absolute top-0 left-0 max-w-none"
              style={{
                width: image.width * scale,
                height: image.height * scale,
                transform: `translate(${-crop.x * scale}px, ${-crop.y * scale}px)`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
