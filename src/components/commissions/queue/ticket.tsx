"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Tape } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { ticketNumber, type QueueOrder, type Step } from "@/lib/commissions/queue";
import { formatUsd } from "@/lib/format";
import { DueLabel, PaymentStamp, Swatches, tapeOf, tiltOf } from "./parts";
import { StepTrack } from "./step-track";


// The stub: the perforation sits a fixed height above the bottom, with a half-circle bite on each side.
const STUB = "2.75rem";
const BITE = `radial-gradient(circle at 0 calc(100% - ${STUB}), transparent 7px, black 7.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% calc(100% - ${STUB}), transparent 7px, black 7.5px) right / 51% 100% no-repeat`;

/** The stamp in the top corner: how the order stands, most final first. */
function CornerStamp({ order }: { order: QueueOrder }) {
  if (order.declined) {
    return (
      <Stamp tone="like" onPaper className="rotate-[5deg] bg-paper">
        Declined
      </Stamp>
    );
  }
  if (order.lane === "delivered") {
    return (
      <Stamp tone="ocean" onPaper className="rotate-[6deg] bg-paper">
        Delivered ✓
      </Stamp>
    );
  }
  if (order.waitlist) {
    return (
      <Stamp tone="lilac" onPaper className="rotate-[4deg] bg-paper">
        Waitlist
      </Stamp>
    );
  }
  return <PaymentStamp order={order} onPaper className="rotate-[4deg] bg-paper" />;
}

/**
 * One commission as a work ticket: the client's reference taped on, who and
 * what it's for, the paint track while it's on the easel, and the deadline
 * and price on the stub. Drag it to another column, or click to open it.
 */
export function Ticket({
  order,
  today,
  onOpen,
  onStep,
}: {
  order: QueueOrder;
  today: string;
  onOpen: () => void;
  onStep?: (step: Step) => void;
}) {
  const cover = order.references[0];
  const tape = tapeOf(order);

  return (
    // Mouse users click anywhere on the ticket; keyboard and screen readers use the title button.
    <article
      data-order={order.id}
      data-part="ticket"
      // Orders move only as they're processed (decided 2026-10-11): open the ticket to answer, start or deliver.
      draggable={false}
      onClick={onOpen}
      className="group/ticket relative cursor-pointer pt-2.5 transition-[rotate,translate,opacity] duration-300 ease-out [rotate:var(--tilt)] hover:-translate-y-0.5 hover:[rotate:0deg]"
      style={{ "--tilt": `${tiltOf(order.id)}deg` } as CSSProperties}
    >
      <div className="drop-shadow-[0_8px_14px_rgb(var(--shadow-rgb)/0.13)] transition-[filter] duration-300 group-hover/ticket:drop-shadow-[0_16px_22px_rgb(var(--shadow-rgb)/0.2)]">
        <div
          className={`relative rounded-[14px] bg-paper text-on-paper ${order.paused || order.archived ? "[&>*]:opacity-60" : ""}`}
          style={{ mask: BITE, WebkitMask: BITE }}
        >
          <div className="flex gap-3 p-3.5 pb-3">
            {cover ? (
              <span
                className="relative mt-0.5 block h-[4.5rem] w-[3.375rem] shrink-0 -rotate-[3deg] overflow-hidden rounded-[5px] border-[2.5px] border-paper shadow-[0_2px_6px_rgb(var(--shadow-rgb)/0.28)]"
                style={{ backgroundColor: cover.palette?.[0] }}
              >
                <Image
                  src={cover.src}
                  alt=""
                  fill
                  sizes="56px"
                  draggable={false}
                  className="object-cover"
                  style={{ objectPosition: cover.focus ?? "50% 25%" }}
                />
              </span>
            ) : (
              <span aria-hidden className="mt-0.5 grid h-[4.5rem] w-[3.375rem] shrink-0 -rotate-[3deg] place-items-center rounded-[5px] border-2 border-dashed border-on-paper/15 text-[0.625rem] font-semibold text-paper-muted">
                no refs
              </span>
            )}
            <div className="min-w-0 flex-1 pr-1">
              <p className="flex items-center gap-1.5 text-[0.625rem] font-bold tracking-[0.16em] text-paper-muted uppercase tabular-nums">
                No. {ticketNumber(order)}
                {order.private && <Lock aria-label="Private commission" className="size-3" />}
              </p>
              <h3 className="mt-1 font-display text-[0.96875rem] leading-tight font-extrabold text-balance">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen();
                  }}
                  className="rounded-[4px] text-left decoration-2 underline-offset-2 hover:underline"
                >
                  {order.service}
                </button>
              </h3>
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-paper-muted">
                <Image
                  src={order.client.avatar.src}
                  alt=""
                  width={16}
                  height={16}
                  draggable={false}
                  className="size-4 shrink-0 rounded-full object-cover"
                  style={{ objectPosition: order.client.avatar.focus }}
                />
                <span className="truncate">
                  for <span className="font-semibold text-on-paper">{order.client.name}</span>
                </span>
              </p>
              {order.character && (
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-paper-muted">
                  <Swatches palette={order.character.palette} />
                  <span className="truncate">{order.character.name}</span>
                </p>
              )}
            </div>
          </div>

          {order.lane === "wip" && order.step && (
            <StepTrack step={order.step} onStep={order.paused ? undefined : onStep} className="px-3.5 pb-3" />
          )}

          <div aria-hidden className="mx-3 border-t-2 border-dashed border-on-paper/15" />
          <div className="flex items-center justify-between gap-2 px-3.5 text-xs" style={{ height: STUB }}>
            <DueLabel order={order} today={today} />
            <span className="font-display text-[0.9375rem] font-extrabold tabular-nums">{order.priceUsd > 0 ? formatUsd(order.priceUsd) : "Quote"}</span>
          </div>
        </div>
      </div>

      {/* Tape holding the reference on, dyed in the character's colors. */}
      {cover && <Tape color={tape} className="top-1.5 left-2.5 h-4! w-11! -rotate-[14deg]" />}

      <div className="pointer-events-none absolute top-0 right-2.5">
        <CornerStamp order={order} />
      </div>

      {order.paused && (
        <div className="pointer-events-none absolute right-3 bottom-[3.75rem]">
          <Stamp tone="paper" className="-rotate-[8deg] bg-paper px-2.5 py-1 text-xs">
            Paused
          </Stamp>
        </div>
      )}
    </article>
  );
}

/** Where a ticket would go: a dashed outline on the mat. */
export function GhostTicket({ children }: { children?: ReactNode }) {
  return (
    <div className="grid h-28 place-items-center rounded-[14px] border-2 border-dashed border-ink/10 px-4 text-center">
      {children}
    </div>
  );
}
