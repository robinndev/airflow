import type { ReactNode } from "react";

/*
 * Small paper-and-pen pieces the gallery shares: a paper clip, the label a
 * ref sheet prints at its corner, and a section divider. Ink uses
 * currentColor, so they work on paper and on the canvas, in both themes.
 */

/** A bent-wire paper clip holding a print to its folder. */
export function PaperClip({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 40" fill="none" className={`pointer-events-none ${className}`}>
      <path
        d="M11 14V31a4 4 0 0 1-8 0V8a5 5 0 0 1 10 0v21a2 2 0 0 1-4 0V12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A section of a character's file: the label, how many, and what goes in it. */
export function SectionLabel({
  id,
  title,
  count,
  hint,
  action,
}: {
  id?: string;
  title: string;
  count?: number;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-dashed border-border pb-2.5">
      <div className="min-w-0">
        <h2 id={id} className="flex items-baseline gap-2.5 font-display text-xl font-extrabold tracking-tight text-ink">
          {title}
          {count !== undefined && <span className="rounded-full bg-ice px-2 py-0.5 text-xs font-bold text-muted tabular-nums">{count}</span>}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
