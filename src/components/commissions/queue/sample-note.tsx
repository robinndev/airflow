"use client";

import { RotateCcw } from "lucide-react";
import { resetQueue } from "./store";

/**
 * Says plainly that the queue is a sample until real requests exist, and
 * puts it back the way it came.
 */
export function SampleNote() {
  return (
    <div className="relative mt-7 max-w-md -rotate-[0.6deg] rounded-[4px] bg-paper py-3 pr-3 pl-5 text-sm text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_10px_24px_-14px_rgb(var(--shadow-rgb)/0.4)]">
      <span
        aria-hidden
        className="absolute top-1/2 -left-2.5 h-5 w-7 -translate-y-1/2 -rotate-[8deg] bg-lilac/45 [clip-path:polygon(0_8%,100%_0,96%_50%,100%_100%,0_92%,4%_50%)]"
      />
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-semibold">These are sample orders.</span>{" "}
          <span className="text-paper-muted">
            Try the board: nothing is sent to anyone, and changes stay on this device. Real requests land here once
            commissions open.
          </span>
        </p>
        <button
          type="button"
          onClick={resetQueue}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-on-paper/15 px-3 py-1 text-[0.8125rem] font-semibold transition-colors hover:bg-on-paper/5"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
