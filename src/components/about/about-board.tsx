import Image from "next/image";
import type { CSSProperties } from "react";
import { artUrl } from "@/lib/art-storage";
import { readingOrder, type Block, type Board } from "@/lib/customization/about";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { Sticker } from "./stickers";

/*
 * Read-only About board. Wide containers get the artist's free-form layout,
 * scaled with container units (1000 board units = full width, `--u`); narrow
 * ones (phones) stack the blocks in reading order so nothing is microscopic.
 */

const FONT: Record<string, string> = {
  sans: "var(--font-inter), system-ui, sans-serif",
  display: "var(--display-font)",
  hand: "var(--font-caveat), 'Bradley Hand', cursive",
  serif: "var(--font-serif), Georgia, serif",
  pixel: "var(--font-pixel), monospace",
};

const MARKER = { heart: "♥", star: "★", check: "✓", cross: "✕", dot: "•" } as const;

/** Dark or light text, whichever reads on this card color (when the artist didn't pick one). */
function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#1f1d2b" : "#f6f4ff";
}

/** Board images are uploads (storage paths); demo profiles use local files. */
export const boardImageSrc = (path: string) => (path.startsWith("/") ? path : artUrl(path));

export function AboutBoard({ board }: { board: Board }) {
  const stacked = readingOrder(board.blocks);
  return (
    <div data-part="board" className="about-board">
      <div
        className="about-board-inner relative hidden overflow-hidden rounded-panel @[640px]:block"
        style={{
          height: `calc(var(--u) * ${board.height})`,
          backgroundColor: board.background === "transparent" ? undefined : board.background,
        }}
      >
        {board.blocks.map((block) => (
          <div
            key={block.id}
            data-part="block"
            data-block={block.type}
            className="absolute"
            style={{
              left: `calc(var(--u) * ${block.x})`,
              top: `calc(var(--u) * ${block.y})`,
              width: `calc(var(--u) * ${block.w})`,
              height: `calc(var(--u) * ${block.h})`,
              rotate: `${block.rotate}deg`,
              zIndex: block.z,
            }}
          >
            <BlockView block={block} scaled />
          </div>
        ))}
      </div>

      <div className="grid gap-3 @[640px]:hidden">
        {stacked.map((block) => (
          <div
            key={block.id}
            className={block.type === "sticker" ? "mx-auto size-20" : ""}
            style={block.type === "image" || block.type === "html" ? { aspectRatio: `${block.w} / ${block.h}` } : undefined}
          >
            <BlockView block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One block, filling its box. `scaled` sizes text in board units (free-form layout). */
export function BlockView({ block, scaled = false }: { block: Block; scaled?: boolean }) {
  switch (block.type) {
    case "text":
    case "list": {
      const size = scaled ? `calc(var(--u) * ${block.size})` : `${Math.min(block.size, 30)}px`;
      const card = block.background && block.background !== "transparent" ? block.background : null;
      const style: CSSProperties = {
        fontFamily: FONT[block.font],
        fontSize: size,
        color: block.color ?? (card ? readableOn(card) : undefined),
        textAlign: block.align,
        backgroundColor: block.background === "transparent" ? undefined : block.background,
      };
      const boxed = block.background !== "transparent";
      const shell = `size-full overflow-hidden leading-snug text-ink ${
        boxed ? "rounded-[1em] p-[0.8em] shadow-soft" : ""
      } ${boxed && !block.background ? "border border-border bg-surface" : ""}`;

      if (block.type === "text") {
        return (
          <div className={`${shell} break-words whitespace-pre-wrap`} style={style}>
            {block.text}
          </div>
        );
      }
      return (
        <div className={shell} style={style}>
          {block.title && <p className="mb-[0.4em] font-display text-[1.15em] font-extrabold">{block.title}</p>}
          <ul className="grid gap-[0.25em]">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-[0.45em]">
                <span aria-hidden className="shrink-0 text-accent">
                  {MARKER[block.marker]}
                </span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "image": {
      // "None" shows the image whole, see-through parts included; the frames fill their shape like the real thing.
      const crops = block.frame !== "none";
      // Small images (doodles, pixel art, stickers) go out as uploaded: the optimizer's lossy re-encode would smear them.
      const small = Math.max(block.image.width, block.image.height) <= 640;
      const img = (
        <Image
          src={boardImageSrc(block.image.path)}
          alt={block.alt}
          fill
          unoptimized={small}
          sizes={`(min-width: 1184px) ${Math.ceil(block.w * 0.8)}px, (min-width: 640px) ${Math.ceil(block.w / 10)}vw, 100vw`}
          className={`${crops ? "object-cover" : "object-contain"} ${block.frame === "round" ? "rounded-full" : ""}`}
        />
      );
      if (block.frame === "polaroid") {
        return (
          <div className="flex size-full flex-col bg-white p-[5%] pb-[16%] shadow-lift">
            <div className="relative min-h-0 flex-1">{img}</div>
          </div>
        );
      }
      return (
        <div className="relative size-full">
          {img}
          {block.frame === "tape" && (
            <>
              <span aria-hidden className="absolute -top-[6%] left-[8%] h-[14%] w-[34%] -rotate-12 bg-[#ffe9a8]/80 shadow-soft" />
              <span aria-hidden className="absolute right-[6%] -bottom-[5%] h-[14%] w-[30%] rotate-[8deg] bg-[#bfe7ff]/80 shadow-soft" />
            </>
          )}
        </div>
      );
    }

    case "sticker":
      return <Sticker id={block.sticker} color={block.color} className="drop-shadow-[0_3px_4px_rgb(0_0_0/0.18)]" />;

    case "html":
      return <HtmlBlock html={block.html} />;
  }
}

/**
 * Flow+ HTML: an iframe with an empty sandbox (no scripts, forms, popups or
 * navigation) and a CSP that only allows our own images — so custom markup
 * can decorate, but never track visitors or run code.
 */
function HtmlBlock({ html }: { html: string }) {
  const csp = `default-src 'none'; img-src data: ${SUPABASE_URL}; style-src 'unsafe-inline'; font-src data:`;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body{margin:0;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
  return (
    <iframe
      title="Custom block"
      sandbox=""
      srcDoc={doc}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-full rounded-[8px] border-0 bg-transparent"
    />
  );
}
