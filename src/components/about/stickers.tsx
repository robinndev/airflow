import type { StickerId } from "@/lib/customization/about";

/*
 * Built-in stickers for the About board, die-cut style: the artist's color,
 * an ink outline and a thick white border (a wider white stroke drawn
 * underneath). Drawn on a 100×100 box, fitted (not stretched) into the block.
 */

const PATHS: Record<StickerId, { d: string; detail?: string }> = {
  heart: { d: "M50 86C24 68 10 52 10 34a19 19 0 0 1 40-9 19 19 0 0 1 40 9c0 18-14 34-40 52z", detail: "M28 30a9 9 0 0 1 9-8" },
  star: { d: "M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z", detail: "M44 30l6-12" },
  sparkle: { d: "M50 6c4 26 18 40 44 44-26 4-40 18-44 44-4-26-18-40-44-44 26-4 40-18 44-44z" },
  flower: {
    d: "M50 34a16 16 0 1 1 15 22 16 16 0 1 1-8 26 16 16 0 1 1-14 0 16 16 0 1 1-8-26 16 16 0 1 1 15-22z",
    detail: "M50 46a8 8 0 1 0 0.1 0z",
  },
  cloud: { d: "M26 76a18 18 0 0 1-2-36 22 22 0 0 1 42-8 17 17 0 0 1 12 44z", detail: "M34 52q4 4 8 0M58 52q4 4 8 0" },
  moon: { d: "M62 10a40 40 0 1 0 28 62A32 32 0 0 1 62 10z", detail: "M40 40a3 3 0 1 0 0.1 0" },
  crown: { d: "M14 74l-4-46 22 18 18-30 18 30 22-18-4 46z", detail: "M18 64h64" },
  paw: {
    d: "M50 52c14 0 26 14 26 26 0 8-8 10-14 8-6-2-8-4-12-4s-6 2-12 4c-6 2-14 0-14-8 0-12 12-26 26-26zM24 46a9 11 0 1 1 0.1 0zM40 30a9 12 0 1 1 0.1 0zM60 30a9 12 0 1 1 0.1 0zM76 46a9 11 0 1 1 0.1 0z",
  },
  bow: {
    d: "M50 50L14 26q-8 24 0 48zM50 50L86 26q8 24 0 48zM42 50a8 9 0 1 0 16 0 8 9 0 1 0-16 0z",
    detail: "M44 58l-8 28M56 58l8 28",
  },
  music: { d: "M34 78a12 10 0 1 1 0-1V22l46-10v54a12 10 0 1 1 0-1V30L34 40z" },
  palette: {
    d: "M50 10c24 0 42 16 42 36 0 14-10 18-20 16-8-2-12 4-8 10 4 8-2 18-14 18C26 90 8 72 8 50S26 10 50 10z",
    detail: "M30 40a5 5 0 1 0 0.1 0M46 26a5 5 0 1 0 0.1 0M66 30a5 5 0 1 0 0.1 0M28 60a5 5 0 1 0 0.1 0",
  },
  brush: { d: "M84 10L44 54l10 10 40-44c4-6-4-14-10-10zM40 58c-10 0-18 8-18 18 0 6-6 10-12 12 22 4 42-4 40-20z" },
  speech: { d: "M14 18h72a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H44L24 88l4-18H14a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8z", detail: "M28 44h44" },
  arrow: { d: "M10 58c20-30 50-38 70-28l4-14 12 30-30 10 6-12c-16-6-38 0-56 22z" },
  tape: { d: "M8 30l84-8 2 46-84 10z", detail: "M8 30l4 6-4 6 4 6-4 6 4 6-4 6M92 22l-4 6 4 6-4 6 4 6-4 6 4 6" },
  swirl: { d: "M50 50m-6 0a6 6 0 1 1 12 0 14 14 0 1 1-28 0 22 22 0 1 1 44 0 30 30 0 1 1-60 0", detail: "" },

  // The shop's packs. Café Break:
  coffee: { d: "M16 38h56v22c0 17-12 28-28 28S16 77 16 60zM72 46h4a14 14 0 0 1 0 28h-6v-9h6a5 5 0 0 0 0-10h-4z", detail: "M34 28c-4-5 4-9 0-14M50 28c-4-5 4-9 0-14M22 48h44" },
  croissant: { d: "M8 66c6-28 30-44 42-44s36 16 42 44c-8-5-15-5-21 2-6-9-14-12-21-12s-15 3-21 12C23 61 16 61 8 66z", detail: "M36 38l7 18M50 32v22M64 38l-7 18" },
  teacup: { d: "M12 42h62c0 23-13 38-31 38S12 65 12 42zM72 48h6a10 10 0 0 1 0 20h-9l2-8h7a2 2 0 0 0 0-4h-7z", detail: "M8 88h76M30 42c2-10 10-14 18-14" },
  cake: { d: "M8 66l72-32v40L8 88zM62 14a10 10 0 1 0 0.1 0z", detail: "M8 74l72-31M62 24c-2 4-1 8 2 10" },
  // Space Cadet:
  planet: { d: "M50 22a28 28 0 1 0 0.1 0z", detail: "M8 68c-6-12 34-36 62-40s28 8 8 18M36 40a5 5 0 1 0 0.1 0" },
  rocket: { d: "M50 6c16 12 22 34 18 58H32C28 40 34 18 50 6zM32 52 16 74l17-3zM68 52l16 22-17-3zM40 64h20l-4 18H44z", detail: "M50 26a7 7 0 1 0 0.1 0" },
  comet: { d: "M58 26 8 82l64-36zM72 16a18 18 0 1 0 0.1 0z", detail: "M22 68l30-22M66 26l4 6" },
  ufo: { d: "M30 46a20 18 0 0 1 40 0zM6 58c0-8 20-14 44-14s44 6 44 14-20 14-44 14S6 66 6 58z", detail: "M26 58h1M50 62h1M74 58h1M40 34c2-4 6-6 10-6" },
  // Pixel Pack (each cell outlined, like pixels on a grid):
  "pixel-heart": { d: cells("2,1 3,1 6,1 7,1 1,2 2,2 3,2 4,2 5,2 6,2 7,2 8,2 1,3 2,3 3,3 4,3 5,3 6,3 7,3 8,3 1,4 2,4 3,4 4,4 5,4 6,4 7,4 8,4 2,5 3,5 4,5 5,5 6,5 7,5 3,6 4,6 5,6 6,6 4,7 5,7") },
  "pixel-star": { d: cells("4,0 5,0 4,1 5,1 3,2 4,2 5,2 6,2 0,3 1,3 2,3 3,3 4,3 5,3 6,3 7,3 8,3 9,3 1,4 2,4 3,4 4,4 5,4 6,4 7,4 8,4 2,5 3,5 4,5 5,5 6,5 7,5 2,6 3,6 6,6 7,6 1,7 2,7 7,7 8,7") },
  "pixel-sword": { d: cells("8,0 9,0 7,1 8,1 9,1 6,2 7,2 8,2 5,3 6,3 7,3 4,4 5,4 6,4 1,4 3,5 4,5 5,5 2,5 2,6 3,6 4,6 1,7 2,7 4,7 5,7 0,8 1,8 0,9") },
  "pixel-potion": { d: cells("4,0 5,0 4,1 5,1 3,2 4,2 5,2 6,2 2,3 3,3 4,3 5,3 6,3 7,3 1,4 2,4 3,4 4,4 5,4 6,4 7,4 8,4 1,5 2,5 3,5 4,5 5,5 6,5 7,5 8,5 1,6 2,6 3,6 4,6 5,6 6,6 7,6 8,6 2,7 3,7 4,7 5,7 6,7 7,7"), detail: "M30 52h8" },
};

/** Pixel stickers: "col,row" cells on a 10×10 grid, each its own square. */
function cells(list: string) {
  return list
    .split(" ")
    .map((cell) => {
      const [col, row] = cell.split(",").map(Number);
      return `M${col * 9 + 5} ${row * 9 + 5}h9v9h-9z`;
    })
    .join("");
}

export function Sticker({ id, color, className = "" }: { id: StickerId; color: string; className?: string }) {
  const { d, detail } = PATHS[id];
  const open = id === "swirl";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`size-full overflow-visible ${className}`}>
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* white die-cut border */}
        <path d={d} fill="none" stroke="#fff" strokeWidth={open ? 16 : 14} />
        <path
          d={d}
          fill={open ? "none" : color}
          stroke={open ? color : "#1f1d2b"}
          strokeWidth={open ? 8 : 3.2}
        />
        {open && <path d={d} fill="none" stroke="#1f1d2b" strokeWidth="1.4" opacity="0.35" />}
        {detail && <path d={detail} fill="none" stroke="#1f1d2b" strokeWidth="3" opacity="0.55" />}
        {/* a little shine */}
        {!open && <path d={d} fill="url(#sticker-shine)" stroke="none" opacity="0.35" />}
      </g>
      <defs>
        <linearGradient id="sticker-shine" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
