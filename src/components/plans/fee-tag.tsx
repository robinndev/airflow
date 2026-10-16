import { FEE_FREE_UNTIL_LABEL, PLATFORM_FEE_PERCENT } from "@/lib/plans";

const HOLE = "radial-gradient(circle at 50% 17px, transparent 5.5px, black 6px)";

/** The platform fee as a paper price tag pinned to the wall (0% during the founding artists' offer); swings on hover. */
export function FeeTag({ className = "" }: { className?: string }) {
  return (
    <div className={`group/tag flex w-40 flex-col items-center ${className}`}>
      <span aria-hidden className="size-3 rounded-full bg-muted shadow-soft ring-2 ring-surface" />
      <span className="flex origin-top flex-col items-center drop-shadow-[0_10px_14px_rgb(var(--shadow-rgb)/0.22)] group-hover/tag:animate-swing">
        <svg aria-hidden viewBox="0 0 12 26" className="-my-px h-6 w-3 text-muted">
          <path d="M6 0c-3 8 3 14 0 26" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span
          className="flex w-40 -rotate-[5deg] flex-col items-center bg-paper px-3 pt-9 pb-5 text-center text-on-paper [clip-path:polygon(24%_0,76%_0,100%_15%,100%_100%,0_100%,0_15%)]"
          style={{ maskImage: HOLE, WebkitMaskImage: HOLE }}
        >
          <span className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Platform fee</span>
          {/* The founding artists' offer: the usual fee struck out in pencil. */}
          <span className="relative mt-1 font-display text-lg leading-none font-extrabold text-paper-muted tabular-nums">
            {PLATFORM_FEE_PERCENT}%
            <span aria-hidden className="absolute top-1/2 -left-1.5 h-[2.5px] w-[calc(100%+0.75rem)] -rotate-[12deg] rounded-full bg-like/80" />
          </span>
          <span className="font-display text-[2.75rem] leading-none font-extrabold tabular-nums">0%</span>
          <span className="mt-1.5 text-xs leading-tight text-paper-muted">until {FEE_FREE_UNTIL_LABEL}, every finish</span>
        </span>
      </span>
    </div>
  );
}
