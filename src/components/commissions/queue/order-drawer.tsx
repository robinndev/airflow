"use client";

import Image from "next/image";
import { Archive, ArchiveRestore, Check, Lock, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { saveOrderNote } from "@/app/(site)/request-actions";
import { Tape } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";
import {
  LANE_INFO,
  LANES,
  moveTo,
  nextAction,
  ticketNumber,
  type Lane,
  type NextAction,
  type OrderPatch,
  type QueueOrder,
  type Step,
} from "@/lib/commissions/queue";
import { formatLongDate, formatUsdExact } from "@/lib/format";
import { PLATFORM_FEE_PERCENT } from "@/lib/plans";
import { LiveNextStep } from "./live-order";
import { DueLabel, LANE_TONE, tapeOf } from "./parts";
import { StepTrack } from "./step-track";
import { updateOrder } from "./store";

/**
 * One commission, opened like its job folder: the next thing to do, where it
 * stands, the buyer's request and references, the money and the dates, and
 * a private note. Slides in from the right (a sheet from the bottom on phones).
 */
export function OrderDrawer({
  order,
  today,
  onClose,
  onMove,
  onStep,
  onAction,
  onPatch,
}: {
  order: QueueOrder | null;
  today: string;
  onClose: () => void;
  onMove: (id: string, lane: Lane) => void;
  onStep: (id: string, step: Step) => void;
  onAction: (order: QueueOrder, action: NonNullable<NextAction>) => void;
  onPatch: (order: QueueOrder, patch: OrderPatch, label: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Keep showing the last order while the sheet closes.
  const [shown, setShown] = useState(order);
  if (order && order !== shown) setShown(order);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="order-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
      className="m-0 mt-auto h-[90dvh] max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim/40 backdrop:backdrop-blur-[2px] open:animate-rise sm:mt-0 sm:ml-auto sm:h-dvh sm:w-[29rem]"
    >
      {shown && (
        <Folder
          key={shown.id}
          order={shown}
          today={today}
          close={() => ref.current?.close()}
          onMove={onMove}
          onStep={onStep}
          onAction={onAction}
          onPatch={onPatch}
        />
      )}
    </dialog>
  );
}

function Folder({
  order,
  today,
  close,
  onMove,
  onStep,
  onAction,
  onPatch,
}: {
  order: QueueOrder;
  today: string;
  close: () => void;
  onMove: (id: string, lane: Lane) => void;
  onStep: (id: string, step: Step) => void;
  onAction: (order: QueueOrder, action: NonNullable<NextAction>) => void;
  onPatch: (order: QueueOrder, patch: OrderPatch, label: string) => void;
}) {
  const action = nextAction(order);
  const fee = (order.priceUsd * PLATFORM_FEE_PERCENT) / 100;
  const name = `${order.client.name}'s ${order.service.toLowerCase()}`;

  return (
    <div className="grain flex h-full flex-col overflow-hidden rounded-t-panel border border-border bg-surface text-ink shadow-lift sm:rounded-none sm:rounded-l-panel">
      <header className="border-b border-dashed border-border px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase tabular-nums">
              No. {ticketNumber(order)}
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`size-1.5 rounded-full ${LANE_TONE[order.lane].dot}`} />
                {order.archived ? "Archived" : LANE_INFO[order.lane].label}
              </span>
            </p>
            <h2 id="order-title" className="mt-1.5 font-display text-[1.375rem] leading-tight font-extrabold text-balance">
              {order.service}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Image
                src={order.client.avatar.src}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-full object-cover"
                style={{ objectPosition: order.client.avatar.focus }}
              />
              <span>
                for <span className="font-semibold text-ink">{order.client.name}</span> @{order.client.handle}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
        {/* What to do next comes first. */}
        {order.real ? (
          <LiveNextStep order={order} today={today} />
        ) : (
          <NextStep order={order} action={action} onAction={onAction} onPatch={onPatch} />
        )}

        <Section title="Where it is">
          {/* Real orders move only as they're processed (decided 2026-10-11): the track is read-only. */}
          <div role="group" aria-label={order.real ? "Where the order stands" : "Move to"} className="grid grid-cols-5 gap-1 rounded-[14px] bg-ice p-1">
            {LANES.map((lane) => {
              const current = lane === order.lane;
              return (
                <button
                  key={lane}
                  type="button"
                  aria-pressed={current}
                  disabled={order.real}
                  onClick={() => onMove(order.id, lane)}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-center text-[0.6875rem] leading-tight font-semibold transition-colors disabled:cursor-default ${
                    current ? "bg-surface text-ink shadow-soft" : "text-muted enabled:hover:bg-surface/60 enabled:hover:text-ink"
                  }`}
                >
                  <span aria-hidden className={`size-2 rounded-full ${LANE_TONE[lane].dot} ${current ? "" : "opacity-50"}`} />
                  {LANE_INFO[lane].label}
                </button>
              );
            })}
          </div>
          {order.lane === "wip" && order.step && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-border px-4 py-3">
              <span className="text-sm text-muted">On the easel</span>
              <StepTrack step={order.step} size="lg" onStep={order.paused ? undefined : (step) => onStep(order.id, step)} />
            </div>
          )}
          {order.paused && order.pausedReason && (
            <p className="mt-3 rounded-[12px] bg-ice px-4 py-3 text-sm">
              <span className="font-semibold">Paused:</span> {order.pausedReason}
            </p>
          )}
        </Section>

        <Section title="The request">
          {/* The buyer's words on a slip of paper, taped in. */}
          <figure className="relative mt-1 rotate-[-0.6deg] rounded-[4px] bg-paper px-5 pt-5 pb-4 text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_10px_24px_-12px_rgb(var(--shadow-rgb)/0.35)]">
            <Tape color={tapeOf(order)} className="-top-3 left-6 h-5 w-16 -rotate-6" />
            <blockquote className="text-[0.9375rem] leading-relaxed text-pretty">{order.brief}</blockquote>
            <figcaption className="mt-3 text-xs text-paper-muted">
              {order.client.name} · {formatLongDate(order.requestedAt)}
            </figcaption>
          </figure>
          {order.referenceLinks && (
            <p className="mt-3 text-sm break-words text-muted">
              <span className="font-semibold text-ink">References: </span>
              {order.referenceLinks}
            </p>
          )}
          <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium">
            <Chip>{order.usage === "commercial" ? "Commercial use" : "Personal use"}</Chip>
            {order.private && (
              <Chip>
                <Lock aria-hidden className="size-3" /> Private, don&apos;t post
              </Chip>
            )}
            <Chip>
              <Check aria-hidden className="size-3 text-mint-strong" /> Accepted your terms
            </Chip>
          </ul>
        </Section>

        {(order.references.length > 0 || order.character) && (
          <Section title={order.character ? `References · ${order.character.name}` : "References"}>
            {order.references.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {order.references.map((image, i) => (
                  <span
                    key={image.src}
                    className="relative block h-36 overflow-hidden rounded-[6px] border-[3px] border-paper bg-ice shadow-soft"
                    style={{
                      aspectRatio: `${image.width} / ${image.height}`,
                      maxWidth: "100%",
                      rotate: `${i % 2 ? 1.5 : -1.5}deg`,
                      backgroundColor: image.palette?.[0],
                    }}
                  >
                    <Image src={image.src} alt={image.alt} fill sizes="260px" className="object-cover" />
                  </span>
                ))}
              </div>
            )}
            {order.character && (
              <ul aria-label={`${order.character.name}'s colors`} className="mt-4 flex flex-wrap gap-2">
                {order.character.palette.map((hex) => (
                  <li key={hex} className="flex items-center gap-1.5 rounded-full border border-border py-1 pr-2.5 pl-1 text-xs text-muted">
                    <span className="size-4 rounded-full" style={{ backgroundColor: hex }} />
                    <span className="font-mono uppercase">{hex}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <Section title="Money">
          <dl className="grid gap-1.5 text-sm">
            {order.extras && order.extras.length > 0 && (
              <>
                <Line label="Service">{formatUsdExact(order.priceUsd - order.extras.reduce((sum, extra) => sum + extra.priceUsd, 0))}</Line>
                {order.extras.map((extra) => (
                  <Line key={extra.label} label={`+ ${extra.label}`}>
                    {formatUsdExact(extra.priceUsd)}
                  </Line>
                ))}
                <div className="my-1 border-t border-dashed border-border" />
              </>
            )}
            <Line label="Price">{formatUsdExact(order.priceUsd)}</Line>
            <Line label={`Artiflow fee (${PLATFORM_FEE_PERCENT}%)`}>
              <span className="text-muted">−{formatUsdExact(fee)}</span>
            </Line>
            <div className="my-1 border-t border-dashed border-border" />
            <Line label="You get">
              <span className="font-display text-lg font-extrabold">{formatUsdExact(order.priceUsd - fee)}</span>
            </Line>
          </dl>
        </Section>

        <Section title="Dates">
          <dl className="grid gap-1.5 text-sm">
            <Line label="Requested">{formatLongDate(order.requestedAt)}</Line>
            {order.proposalExpiresAt && order.lane === "proposal" && (
              <Line label="Proposal expires">{formatLongDate(order.proposalExpiresAt)}</Line>
            )}
            {order.paidAt && <Line label="Paid">{formatLongDate(order.paidAt)}</Line>}
            {order.dueAt && <Line label="Due">{formatLongDate(order.dueAt)}</Line>}
            {order.deliveredAt && <Line label="Delivered">{formatLongDate(order.deliveredAt)}</Line>}
          </dl>
          <p className="mt-3 text-sm">
            <DueLabel order={order} today={today} />
          </p>
        </Section>

        <Section title="Note to self">
          <NoteToSelf order={order} />
        </Section>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-dashed border-border px-5 py-3">
        {!order.archived && order.lane !== "delivered" && (
          <button
            type="button"
            onClick={() => onPatch(order, { paused: !order.paused }, order.paused ? `Resumed ${name}` : `Paused ${name}`)}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            {order.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {order.paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onPatch(
              order,
              order.archived ? { archived: false, declined: false } : { archived: true },
              order.archived ? `Took ${name} out of the archive` : `Archived ${name}`,
            )
          }
          className={buttonClasses({ variant: "ghost", size: "sm", className: "ml-auto" })}
        >
          {order.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {order.archived ? "Unarchive" : "Archive"}
        </button>
      </footer>
    </div>
  );
}

/** The primary action (and, for a new request, the three answers: yes, later, no). */
function NextStep({
  order,
  action,
  onAction,
  onPatch,
}: {
  order: QueueOrder;
  action: NextAction;
  onAction: (order: QueueOrder, action: NonNullable<NextAction>) => void;
  onPatch: (order: QueueOrder, patch: OrderPatch, label: string) => void;
}) {
  const name = `${order.client.name}'s ${order.service.toLowerCase()}`;

  if (order.lane === "request" && !order.archived && !order.paused) {
    return (
      <div className="rounded-[18px] bg-ice p-4">
        <p className="text-sm font-semibold">Take this one on?</p>
        <p className="mt-0.5 text-sm text-muted">Accepting sends {order.client.name} a proposal to pay. Declining lets them know kindly.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPatch(order, moveTo(order, "proposal", new Date()), `Sent a proposal for ${name}`)}
            className={buttonClasses({ size: "sm" })}
          >
            Accept & send proposal
          </button>
          {!order.waitlist && (
            <button
              type="button"
              onClick={() => onPatch(order, { waitlist: true }, `Moved ${name} to the waitlist`)}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Waitlist
            </button>
          )}
          <button
            type="button"
            onClick={() => onPatch(order, { archived: true, declined: true }, `Declined ${name}`)}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (order.lane === "proposal" && !order.archived) {
    return (
      <div className="rounded-[18px] bg-ice p-4 text-sm">
        <p className="font-semibold">Waiting on {order.client.name}</p>
        <p className="mt-0.5 text-muted">
          They have the proposal and the pay link. It moves to Up next by itself once they pay; if it expires, the slot comes back.
        </p>
      </div>
    );
  }

  if (!action) return null;
  return (
    <button
      type="button"
      onClick={() => onAction(order, action)}
      className={buttonClasses({ size: "lg", className: "w-full" })}
    >
      {action.label}
    </button>
  );
}

function NoteToSelf({ order }: { order: QueueOrder }) {
  const [draft, setDraft] = useState(order.note ?? "");
  const [status, setStatus] = useState<"idle" | "typing" | "saved">("idle");

  // Saves quietly a moment after typing stops (and on blur): on the server for
  // real orders (only the artist can read it), on this device for the sample.
  const keep = (note: string) => {
    updateOrder(order.id, { note });
    if (order.real) void saveOrderNote(order.id, note);
  };
  useEffect(() => {
    if (status !== "typing") return;
    const timer = setTimeout(() => {
      keep(draft);
      setStatus("saved");
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep() is rebuilt each render; the draft is what matters.
  }, [draft, status, order.id]);

  return (
    <div>
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setStatus("typing");
        }}
        onBlur={() => {
          if (status !== "typing") return;
          keep(draft);
          setStatus("saved");
        }}
        rows={3}
        maxLength={500}
        placeholder="Only you see this. Colors to check, things they mentioned…"
        aria-label="Note to self"
        className="dot-paper w-full resize-y rounded-input border border-border px-3.5 py-2.5 text-sm text-on-paper placeholder:text-paper-muted focus:border-ocean focus:outline-none"
      />
      <p aria-live="polite" className="mt-1 h-4 text-xs text-muted">
        {status === "typing" ? "Saving…" : status === "saved" ? (order.real ? "Saved, only you see it" : "Saved on this device") : ""}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <li className="inline-flex items-center gap-1 rounded-full bg-ice px-2.5 py-1 text-ink/85">{children}</li>;
}
