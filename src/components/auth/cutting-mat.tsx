import { RulerCursor } from "./ruler-cursor";

// Major marks every 120px (5 cells), numbered 5, 10, 15… like a real mat.
const X_MARKS = Array.from({ length: 22 }, (_, i) => i + 1);
const Y_MARKS = Array.from({ length: 14 }, (_, i) => i + 1);

/**
 * The desk under the auth pages: a self-healing cutting mat with rulers on
 * two edges, angle guides in a corner and the maker's print. Fixed behind the
 * page and purely decorative; the light under it comes from `#desk-light`.
 */
export function CuttingMat() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      <div className="mat-grid absolute inset-0" />

      <AngleGuides className="absolute bottom-0 left-0 w-[min(78vw,620px)] text-ink" />

      <div className="ruler-x absolute inset-x-0 top-0 h-7 border-b border-ink/10 bg-surface/35 backdrop-blur-[2px]">
        {X_MARKS.map((n) => (
          <span
            key={n}
            className="absolute top-1 text-[0.5625rem] leading-none font-semibold text-ink/40 tabular-nums"
            style={{ left: 28 + n * 120 + 3 }}
          >
            {n * 5}
          </span>
        ))}
      </div>
      <div className="ruler-y absolute inset-y-0 left-0 w-7 border-r border-ink/10 bg-surface/35 backdrop-blur-[2px]">
        {Y_MARKS.map((n) => (
          <span
            key={n}
            className="absolute left-1 text-[0.5625rem] leading-none font-semibold text-ink/40 tabular-nums"
            style={{ top: 28 + n * 120 + 3 }}
          >
            {n * 5}
          </span>
        ))}
      </div>
      <span className="absolute top-0 left-0 grid size-7 place-items-center border-r border-b border-ink/10 bg-surface/60 text-[0.5rem] font-bold text-ink/40">
        cm
      </span>

      <p className="absolute right-5 bottom-3 hidden text-[0.5625rem] font-bold tracking-[0.22em] text-ink/30 uppercase sm:block">
        Artiflow studio mat <span className="px-1.5">✦</span> self-healing <span className="px-1.5">✦</span> A2 · 60 × 45
      </p>

      <RulerCursor />
    </div>
  );
}

/** 30°, 45° and 60° guides with two protractor arcs, from the bottom-left corner. */
function AngleGuides({ className = "" }: { className?: string }) {
  const arcTicks = Array.from({ length: 7 }, (_, i) => (i * 15 * Math.PI) / 180);
  return (
    <svg viewBox="0 0 600 600" fill="none" className={className}>
      <g stroke="currentColor" strokeOpacity=".1" strokeWidth="1.25">
        <path d="M0 600 600 0" />
        <path d="M0 600 600 254" strokeDasharray="6 6" />
        <path d="M0 600 346 0" strokeDasharray="6 6" />
        <path d="M230 600A230 230 0 0 0 0 370" />
        <path d="M460 600A460 460 0 0 0 0 140" strokeDasharray="2 5" />
        {arcTicks.map((a) => (
          <path
            key={a}
            d={`M${230 * Math.cos(a)} ${600 - 230 * Math.sin(a)}L${244 * Math.cos(a)} ${600 - 244 * Math.sin(a)}`}
          />
        ))}
      </g>
      <g fill="currentColor" fillOpacity=".22" fontSize="11" fontWeight="700">
        <text x="262" y="478">30°</text>
        <text x="200" y="416">45°</text>
        <text x="142" y="372">60°</text>
      </g>
    </svg>
  );
}
