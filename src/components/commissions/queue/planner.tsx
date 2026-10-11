"use client";

import { HandNote, Tape } from "@/components/explore/doodles";
import type { ViewerQueue } from "@/lib/commissions/queries";
import { daysAhead, dueState, sortOrders, tally, type QueueOrder } from "@/lib/commissions/queue";
import { formatUsd, formatUsdExact } from "@/lib/format";
import { PLATFORM_FEE_PERCENT } from "@/lib/plans";
import { DueLabel, tapeOf } from "./parts";
import { openOrder } from "./open-order";
import { useQueue } from "./store";

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

/** The date a ticket is pencilled in for: its deadline, or when its proposal runs out. */
const dateOf = (order: QueueOrder) => order.dueAt ?? (order.lane === "proposal" ? order.proposalExpiresAt : undefined);

/**
 * A page torn from the artist's planner: the next seven days with every
 * deadline inked in the character's color, what's next, and the month so far.
 * Reads the same store as the board, so moving a ticket updates it.
 */
export function Planner({ queue }: { queue: ViewerQueue }) {
  const { orders } = useQueue(queue);
  const { today } = queue;
  const days = daysAhead(today, 7);
  const live = orders.filter((order) => !order.archived && !order.paused && order.lane !== "delivered");
  const late = live.filter((order) => dueState(order, today).tone === "late");
  const next = sortOrders(live.filter(dateOf), "due").slice(0, 3);
  const totals = tally(orders, today, PLATFORM_FEE_PERCENT);
  const todayDate = new Date(`${today}T12:00:00Z`);

  return (
    <aside aria-labelledby="planner-heading" className="relative mx-auto w-full max-w-[25rem] rotate-[1.4deg] lg:mr-0 lg:ml-auto">
      <Tape tone="sky" className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
      <div className="grain rounded-[6px] bg-paper px-5 pt-8 pb-5 text-on-paper shadow-lift sm:px-6">
        {/* Punched holes where it was torn off the binder rings. */}
        <span aria-hidden className="absolute inset-x-8 top-3 flex justify-between">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="size-2.5 rounded-full bg-canvas shadow-[inset_0_1px_2px_rgb(var(--shadow-rgb)/0.35)]" />
          ))}
        </span>

        <div className="flex items-baseline justify-between gap-3">
          <h2 id="planner-heading" className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">
            The week ahead
          </h2>
          <HandNote tone="paper" className="text-xl">
            {monthYear.format(todayDate)}
          </HandNote>
        </div>

        <ol className="mt-3 grid grid-cols-7 gap-1 text-center">
          {days.map((day, i) => {
            const due = live.filter((order) => dateOf(order)?.slice(0, 10) === day);
            const date = new Date(`${day}T12:00:00Z`);
            return (
              <li key={day} className="flex flex-col items-center gap-1">
                <span className="text-[0.625rem] font-bold text-paper-muted uppercase">{weekday.format(date)}</span>
                <span className="relative grid size-8 place-items-center font-display text-[0.9375rem] font-extrabold tabular-nums">
                  {date.getUTCDate()}
                  {i === 0 && (
                    <svg aria-hidden viewBox="0 0 32 32" fill="none" className="scribble-in absolute -inset-0.5 text-ocean">
                      <path
                        d="M17 3.2c7.4.2 12.4 5.6 11.8 12.6-.6 6.8-6.4 12-13.2 11.6C8.8 27 3.6 21.6 4 15c.4-6.6 6-11.6 13.8-11"
                        pathLength={1}
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex h-2.5 items-center justify-center gap-0.5">
                  {due.slice(0, 3).map((order) => (
                    <span
                      key={order.id}
                      title={`${order.client.name} · ${order.service}`}
                      className={`size-2 rounded-full ${order.lane === "proposal" ? "border-[1.5px] bg-transparent" : ""}`}
                      style={order.lane === "proposal" ? { borderColor: tapeOf(order) } : { backgroundColor: tapeOf(order) }}
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="sr-only">
          Today is circled. Filled dots are deadlines, rings are proposals that expire that day.
        </p>

        <div className="mt-4 border-t border-dashed border-on-paper/15 pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Next up</h3>
            {late.length > 0 && (
              <span className="-rotate-1 rounded-[3px] bg-like/25 px-1.5 text-xs font-bold">{late.length} past due</span>
            )}
          </div>
          {next.length > 0 ? (
            <ul className="mt-2 grid grid-cols-1 gap-1">
              {next.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => openOrder(order.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-on-paper/5"
                  >
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tapeOf(order) }} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{order.client.name}</span>
                      <span className="text-paper-muted"> · {order.service}</span>
                    </span>
                    <DueLabel order={order} today={today} className="shrink-0 text-xs" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <HandNote tone="paper" className="mt-2 text-xl">
              a clear week. draw something for you?
            </HandNote>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-on-paper/15 pt-3.5">
          <Stat label="need you" value={String(totals.needsYou)} />
          <Stat label="in progress" value={formatUsd(totals.inProgressUsd)} />
          <Stat label={`earned in ${month.format(todayDate)}`} value={formatUsdExact(totals.earnedThisMonthUsd)} />
        </dl>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-paper-muted">{label}</dt>
      <dd className="font-display text-xl leading-tight font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

/** Same footprint as the planner while it streams in. */
export function PlannerSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[25rem] rotate-[1.4deg] lg:mr-0 lg:ml-auto">
      <div className="h-[23rem] skeleton rounded-[6px] bg-paper/70 shadow-soft" />
    </div>
  );
}
