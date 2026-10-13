"use client";

import { HandNote } from "@/components/explore/doodles";
import { LANE_INFO, LANES, laneOrder, type Lane, type QueueOrder, type Step } from "@/lib/commissions/queue";
import { LANE_TONE } from "./parts";
import { GhostTicket, Ticket } from "./ticket";

/**
 * The board: five columns laid out on the cutting mat, each headed by a strip
 * of masking tape. A ticket's column is where its order stands; it moves as
 * the order is processed (from its drawer), never by dragging.
 */
export function Board({
  orders,
  today,
  onOpen,
  onStep,
}: {
  orders: QueueOrder[];
  today: string;
  onOpen: (id: string) => void;
  onStep: (id: string, step: Step) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-4 [scrollbar-width:thin] sm:-mx-6 sm:px-6">
      <div className="flex w-max snap-x snap-mandatory gap-4 sm:gap-5">
        {LANES.map((lane) => {
          const tickets = laneOrder(orders, lane);
          return (
            <section key={lane} aria-labelledby={`lane-${lane}`} data-lane={lane} className="flex w-[min(84vw,15.5rem)] shrink-0 snap-start flex-col">
              <LaneLabel lane={lane} count={tickets.length} />

              <div className="relative mt-3 flex min-h-[22rem] flex-1 flex-col gap-4 rounded-[22px] p-3 pt-2.5">
                {tickets.map((order) => (
                  <Ticket key={order.id} order={order} today={today} onOpen={() => onOpen(order.id)} onStep={(step) => onStep(order.id, step)} />
                ))}
                {tickets.length === 0 && (
                  <GhostTicket>
                    <HandNote tone="muted" className="text-xl">
                      nothing pinned here
                    </HandNote>
                  </GhostTicket>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Torn ends, like masking tape pulled off the roll.
const TORN =
  "[clip-path:polygon(0_12%,2%_0,98%_6%,100%_20%,98.5%_50%,100%_82%,97%_100%,3%_94%,0_76%,1.5%_45%)]";

/** A strip of masking tape stuck on the mat: the column's name, its count and a pencilled aside. */
function LaneLabel({ lane, count }: { lane: Lane; count: number }) {
  const { label, hint } = LANE_INFO[lane];
  return (
    <header className="px-1">
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`lane-${lane}`}
          className={`relative inline-flex -rotate-[1.2deg] items-center gap-2 bg-[color-mix(in_oklab,var(--star)_14%,var(--paper))] py-1.5 pr-4 pl-3 font-display text-[0.9375rem] leading-none font-extrabold whitespace-nowrap text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.18)] ${TORN}`}
        >
          <span aria-hidden className={`size-2 rounded-full ${LANE_TONE[lane].dot}`} />
          {label}
        </h3>
        <span className="relative grid size-8 place-items-center font-display text-sm font-extrabold text-ink tabular-nums">
          <span className="sr-only">{count === 1 ? "1 ticket" : `${count} tickets`}</span>
          <span aria-hidden>{count}</span>
          {/* Circled in pencil. */}
          <svg aria-hidden viewBox="0 0 32 32" fill="none" className="absolute inset-0 text-muted/60">
            <path d="M16 3.5c7.6-.3 13 5 12.6 12.4-.4 7-6.3 12.4-13.2 12.1C8.4 27.7 3.3 22 3.6 15.2 4 8.4 9.6 3.3 17.4 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <HandNote tone="muted" className="mt-1.5 ml-1 text-lg">
        {hint}
      </HandNote>
    </header>
  );
}
