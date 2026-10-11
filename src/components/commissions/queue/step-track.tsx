"use client";

import { PaintBucket, Pencil, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { STEP_LABEL, STEPS, type Step } from "@/lib/commissions/queue";

export const STEP_ICON: Record<Step, LucideIcon> = {
  sketch: Pencil,
  lineart: PenLine,
  flats: PaintBucket,
  render: Sparkles,
};

// One brush stroke per step, each a little different, like they were painted by hand.
const STROKES = ["M3 7C10 4 20 8 29 5", "M2 6c9 1 18-3 28 0", "M3 5c8 3 17 2 27-1", "M2 7c10-3 19 1 28-2"];

/**
 * Rough sketch → render as four brush strokes: done ones in ink, the current
 * one in the theme's accent, the rest still pencil-faint. With `onStep`, each
 * stroke is a button that sets the step.
 */
export function StepTrack({
  step,
  onStep,
  size = "sm",
  className = "",
}: {
  step: Step;
  onStep?: (step: Step) => void;
  size?: "sm" | "lg";
  className?: string;
}) {
  const at = STEPS.indexOf(step);
  const Icon = STEP_ICON[step];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ol aria-label={`Progress: ${STEP_LABEL[step]}, step ${at + 1} of 4`} className="flex items-center">
        {STEPS.map((s, i) => {
          const tone = i < at ? "text-current opacity-55" : i === at ? "text-ocean" : "text-current opacity-15";
          const stroke = (
            <svg aria-hidden viewBox="0 0 32 12" className={`${size === "lg" ? "h-4 w-12" : "h-3 w-7"} ${tone}`} fill="none">
              <path d={STROKES[i]} stroke="currentColor" strokeWidth={size === "lg" ? 4 : 4.5} strokeLinecap="round" />
            </svg>
          );
          return (
            <li key={s} className="relative">
              {onStep ? (
                <button
                  type="button"
                  aria-label={`Set progress to ${STEP_LABEL[s]}`}
                  aria-pressed={i === at}
                  title={STEP_LABEL[s]}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStep(s);
                  }}
                  className="relative z-10 -my-2 block rounded-full px-0.5 py-2 transition-transform hover:-translate-y-px"
                >
                  {stroke}
                </button>
              ) : (
                <span className="block px-0.5">{stroke}</span>
              )}
            </li>
          );
        })}
      </ol>
      <span className={`inline-flex items-center gap-1 font-semibold ${size === "lg" ? "text-sm" : "text-xs"}`}>
        <Icon aria-hidden className={size === "lg" ? "size-4 text-ocean" : "size-3.5 text-ocean"} />
        {STEP_LABEL[step]}
      </span>
    </div>
  );
}
