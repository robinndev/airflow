"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { HandNote } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import {
  LANE_INFO,
  nextAction,
  sortOrders,
  ticketNumber,
  type NextAction,
  type QueueOrder,
  type SortKey,
} from "@/lib/commissions/queue";
import { formatShortDate, formatUsd } from "@/lib/format";
import { DueLabel, LANE_TONE, PaymentStamp, Swatches } from "./parts";
import { StepTrack } from "./step-track";

type Sort = { key: SortKey; dir: "asc" | "desc" };

/**
 * The ledger: every order on one ruled page, with a red margin line like an
 * accounts book. Sort by due date, request date or price; click a row to open it.
 */
export function Ledger({
  orders,
  today,
  onOpen,
  onAction,
}: {
  orders: QueueOrder[];
  today: string;
  onOpen: (id: string) => void;
  onAction: (order: QueueOrder, action: NonNullable<NextAction>) => void;
}) {
  const [sort, setSort] = useState<Sort>({ key: "due", dir: "asc" });
  const rows = sortOrders(orders, sort.key, sort.dir);

  const header = (key: SortKey, label: string, className = "") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowDown : ArrowUp;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
        className={`py-3 pr-4 font-bold ${className}`}
      >
        <button
          type="button"
          onClick={() => setSort({ key, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
          className={`inline-flex items-center gap-1 rounded-[6px] uppercase transition-colors hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <Icon aria-hidden className={`size-3 ${active ? "" : "opacity-50"}`} />
        </button>
      </th>
    );
  };

  return (
    <div className="relative overflow-x-auto">
      {/* The margin rule, two thin red lines down the page. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[4.25rem] hidden w-[3px] border-x border-like/35 sm:block" />
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Your commissions</caption>
        <thead>
          <tr className="text-left text-[0.625rem] tracking-[0.16em] text-muted uppercase">
            <th scope="col" className="hidden w-[4.25rem] py-3 pl-5 font-bold sm:table-cell">
              No.
            </th>
            <th scope="col" className="py-3 pr-4 pl-4 font-bold sm:pl-6">
              Piece
            </th>
            <th scope="col" className="hidden py-3 pr-4 font-bold md:table-cell">
              Stage
            </th>
            <th scope="col" className="hidden py-3 pr-4 font-bold xl:table-cell">
              Payment
            </th>
            {header("requested", "Requested", "hidden lg:table-cell")}
            {header("due", "Due")}
            {header("price", "Price", "text-right")}
            <th scope="col" className="hidden py-3 pr-5 font-bold sm:table-cell">
              <span className="sr-only">Next step</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <Row key={order.id} order={order} today={today} onOpen={() => onOpen(order.id)} onAction={onAction} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="border-t border-border px-6 py-16 text-center">
                <HandNote tone="muted" className="text-2xl">
                  nothing written on this page yet
                </HandNote>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  order,
  today,
  onOpen,
  onAction,
}: {
  order: QueueOrder;
  today: string;
  onOpen: () => void;
  onAction: (order: QueueOrder, action: NonNullable<NextAction>) => void;
}) {
  const cover = order.references[0];
  const action = nextAction(order);
  const cell = "py-3 pr-4 align-middle";

  return (
    <tr
      onClick={onOpen}
      data-order={order.id}
      className={`group cursor-pointer border-t border-border transition-colors hover:bg-ice/55 ${order.paused || order.archived ? "text-ink/70" : ""}`}
    >
      <td className={`${cell} hidden pl-5 font-display text-xs font-bold text-muted tabular-nums sm:table-cell`}>
        {ticketNumber(order)}
      </td>
      <td className={`${cell} pl-4 sm:pl-6`}>
        <div className="flex items-center gap-3">
          {cover ? (
            <span
              className="relative block h-11 w-9 shrink-0 -rotate-2 overflow-hidden sm:h-12 sm:w-10 rounded-[5px] border-2 border-surface shadow-[0_1px_4px_rgb(var(--shadow-rgb)/0.25)] transition-[rotate] group-hover:rotate-0"
              style={{ backgroundColor: cover.palette?.[0] }}
            >
              <Image src={cover.src} alt="" fill sizes="40px" className="object-cover" style={{ objectPosition: cover.focus ?? "50% 25%" }} />
            </span>
          ) : (
            <span aria-hidden className="block h-11 w-9 shrink-0 -rotate-2 rounded-[5px] border-2 border-dashed border-border sm:h-12 sm:w-10" />
          )}
          <div className="min-w-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="text-left font-display leading-snug font-bold text-ink decoration-2 underline-offset-2 hover:underline"
            >
              {order.service}
            </button>
            <p className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-xs text-muted">
              <Image
                src={order.client.avatar.src}
                alt=""
                width={16}
                height={16}
                className="size-4 rounded-full object-cover"
                style={{ objectPosition: order.client.avatar.focus }}
              />
              <span className="truncate font-semibold text-ink/80">{order.client.name}</span>
              {/* Phones keep it to the client; the character shows from sm up. */}
              {order.character && (
                <span className="hidden min-w-0 items-center gap-x-1.5 sm:flex">
                  <span aria-hidden>·</span>
                  <Swatches palette={order.character.palette} ring="ring-surface" />
                  <span className="truncate">{order.character.name}</span>
                </span>
              )}
              {order.private && <Lock aria-label="Private commission" className="size-3" />}
            </p>
          </div>
        </div>
      </td>
      <td className={`${cell} hidden md:table-cell`}>
        <Stage order={order} />
      </td>
      <td className={`${cell} hidden xl:table-cell`}>
        {order.payment === "unpaid" && (order.lane === "request" || order.lane === "proposal") ? (
          <span className="text-muted">—</span>
        ) : (
          <PaymentStamp order={order} />
        )}
      </td>
      <td className={`${cell} hidden whitespace-nowrap text-muted tabular-nums lg:table-cell`}>{formatShortDate(order.requestedAt)}</td>
      <td className={`${cell} whitespace-nowrap`}>
        <DueLabel order={order} today={today} className="text-ink" />
        {order.dueAt && order.lane !== "delivered" && (
          <span className="mt-0.5 block pl-5 text-xs text-muted tabular-nums">{formatShortDate(order.dueAt)}</span>
        )}
      </td>
      <td className={`${cell} text-right font-display font-extrabold whitespace-nowrap text-ink tabular-nums`}>
        {formatUsd(order.priceUsd)}
      </td>
      <td className={`${cell} hidden pr-5 text-right sm:table-cell`}>
        {action ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAction(order, action);
            }}
            className={buttonClasses({
              variant: action.kind === "deliver" || action.kind === "review" ? "primary" : "soft",
              size: "sm",
              className: "relative z-10",
            })}
          >
            {action.label}
          </button>
        ) : order.lane === "proposal" && !order.archived ? (
          <HandNote tone="muted" className="text-lg">
            their move
          </HandNote>
        ) : null}
      </td>
    </tr>
  );
}

function Stage({ order }: { order: QueueOrder }) {
  let extra: ReactNode = null;
  if (order.declined) extra = <Stamp tone="like">Declined</Stamp>;
  else if (order.paused) extra = <Stamp tone="muted">Paused</Stamp>;
  else if (order.waitlist) extra = <Stamp tone="lilac">Waitlist</Stamp>;

  return (
    <div className="flex flex-col items-start gap-1.5">
      {order.lane === "wip" && order.step ? (
        <StepTrack step={order.step} className="text-ink" />
      ) : (
        <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap text-ink">
          <span aria-hidden className={`size-2 rounded-full ${LANE_TONE[order.lane].dot}`} />
          {LANE_INFO[order.lane].label}
        </span>
      )}
      {extra}
    </div>
  );
}
