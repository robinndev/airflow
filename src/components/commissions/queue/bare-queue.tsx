import Link from "next/link";
import { HandNote, Tape } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";
import { LANE_INFO, LANES } from "@/lib/commissions/queue";
import { LANE_TONE } from "./parts";

/*
 * The queue before it loads, and for visitors: the cutting mat with its
 * column labels and the outlines where tickets would sit.
 */

function GhostLanes({ breathing = false }: { breathing?: boolean }) {
  return (
    <div className="flex gap-4 overflow-hidden sm:gap-5">
      {LANES.map((lane, i) => (
        <div key={lane} className="flex w-[min(84vw,15.5rem)] shrink-0 flex-col">
          <span
            className={`inline-flex w-fit -rotate-[1.2deg] items-center gap-2 bg-[color-mix(in_oklab,var(--star)_14%,var(--paper))] py-1.5 pr-4 pl-3 font-display text-[0.9375rem] leading-none font-extrabold text-on-paper opacity-70`}
          >
            <span aria-hidden className={`size-2 rounded-full ${LANE_TONE[lane].dot}`} />
            {LANE_INFO[lane].label}
          </span>
          <div className="mt-10 grid gap-4 p-3">
            {Array.from({ length: [2, 1, 1, 3, 2][i] }, (_, n) => (
              <div
                key={n}
                className={`h-32 rounded-[14px] ${breathing ? "skeleton bg-paper/70" : "border-2 border-dashed border-ink/10"}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const panel = "relative overflow-hidden rounded-panel border border-border bg-ice p-4 pt-6 shadow-soft mat-grid sm:p-6 sm:pt-7";

/** Same footprint as the workspace while it streams in. */
export function QueueSkeleton() {
  return (
    <div aria-busy aria-label="Loading your commissions">
      <div className="flex h-11 items-end gap-1">
        {[16, 24, 28, 22].map((w, i) => (
          <span key={i} className={`h-9 skeleton rounded-t-[14px] bg-surface/70`} style={{ width: `${w * 0.25}rem` }} />
        ))}
      </div>
      <div className={`${panel} rounded-tl-none`}>
        <GhostLanes breathing />
      </div>
    </div>
  );
}

/** Visitors: the empty mat, and a note pinned in the middle. */
export function SignedOutQueue() {
  return (
    <div className={panel}>
      <div aria-hidden className="opacity-80">
        <GhostLanes />
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="grain relative w-full max-w-md -rotate-[0.8deg] rounded-[4px] bg-paper px-6 pt-8 pb-7 text-center text-on-paper shadow-lift sm:px-9">
          <Tape tone="mint" className="-top-3 left-1/2 -translate-x-1/2 -rotate-2" />
          <h2 className="font-display text-xl leading-tight font-extrabold">Your commission queue lives here.</h2>
          <p className="mt-2 text-sm leading-relaxed text-paper-muted">
            Sign in to see new requests, deadlines and everything on your easel, as a board or a ledger.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/sign-in?next=/commissions" className={buttonClasses()}>
              Sign in
            </Link>
            <Link
              href="/join"
              className="inline-flex h-10 items-center justify-center rounded-action border border-on-paper/15 px-4 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Visitors' planner: a blank page with a pencilled hint. */
export function BlankPlanner() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[25rem] rotate-[1.4deg] lg:mr-0 lg:ml-auto">
      <Tape tone="sky" className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
      <div className="grain dot-paper grid h-[21rem] place-items-center rounded-[6px] px-6 text-center shadow-lift">
        <HandNote tone="paper" className="text-2xl">
          your deadlines go here
        </HandNote>
      </div>
    </div>
  );
}
