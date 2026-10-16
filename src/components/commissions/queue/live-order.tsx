"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, PackageCheck, Send, Undo2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { refundOrder } from "@/app/(site)/payment-actions";
import {
  declineRequest,
  deliverOrder,
  quoteRequest,
  startOrder,
  waitlistRequest,
  type RequestResult,
} from "@/app/(site)/request-actions";
import { showToast } from "@/components/favorites/toast-events";
import { inputClass } from "@/components/studio/fields";
import { ListingImages } from "@/components/studio/listing-images";
import { buttonClasses } from "@/components/ui/button";
import { CANCEL_READS } from "@/lib/commissions/cancel";
import type { QueueOrder } from "@/lib/commissions/queue";
import { formatDay, formatLongDate, formatUsdExact } from "@/lib/format";
import type { EditableImage } from "@/lib/listings/editable";
import { updateOrder } from "./store";

const DAY = 86_400_000;

/** Runs an order action: the change shows right away, then the server's copy replaces it. */
export function useLiveAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(order: QueueOrder, action: () => Promise<RequestResult>, show: Parameters<typeof updateOrder>[1], message: string, after?: () => void) {
    start(async () => {
      updateOrder(order.id, show);
      const result = await action();
      if (!result.ok) showToast({ message: result.error });
      else {
        showToast({ message });
        after?.();
      }
      router.refresh();
    });
  }
  return [pending, run] as const;
}

/**
 * What to do next with a real order, by where it stands: answer a request
 * (quote, waitlist, decline), wait for the buyer to pay (through Stripe, into
 * the artist's own account), start, deliver; refund before delivering.
 */
export function LiveNextStep({ order, today }: { order: QueueOrder; today: string }) {
  const [pending, run] = useLiveAction();
  const name = order.client.name;
  const status = order.orderStatus;

  if (status === "cancelled") {
    return (
      <div className="rounded-[18px] bg-ice p-4 text-sm">
        <p className="font-semibold">
          {name} cancelled
          {order.cancelReason ? <span className="font-normal text-muted">: {CANCEL_READS[order.cancelReason]}.</span> : "."}
        </p>
        {order.cancelNote && <p className="mt-2 rounded-[10px] bg-surface px-3 py-2 text-ink/85">&ldquo;{order.cancelNote}&rdquo;</p>}
        <p className="mt-2 text-muted">The slot went back to the service. Nothing was charged.</p>
      </div>
    );
  }

  if (status === "refunded") {
    return (
      <div className="rounded-[18px] bg-ice p-4 text-sm">
        <p className="font-semibold">
          {order.refundedBy === "team" ? "Artiflow refunded it" : "Refunded"}
          {order.refundedAt && <> {formatDay(order.refundedAt)}</>}.{" "}
          {order.charged?.refundPending
            ? `It's waiting on your Stripe balance: it goes back to ${name} as soon as your balance covers it.`
            : `${name} gets the money back on their card.`}
        </p>
        {order.refundNote && <p className="mt-2 rounded-[10px] bg-surface px-3 py-2 text-ink/85">&ldquo;{order.refundNote}&rdquo;</p>}
        <p className="mt-2 text-muted">The slot went back to the service.</p>
      </div>
    );
  }

  if (order.archived && (status === "declined" || status === "expired")) {
    const why = { declined: "You declined this request.", expired: "The quote expired before it was paid." }[status];
    return <p className="rounded-[18px] bg-ice p-4 text-sm text-muted">{why} The slot went back to the service.</p>;
  }

  if (status === "pending" || status === "waitlisted") {
    return <Answer order={order} today={today} pending={pending} run={run} />;
  }

  if (status === "quoted") {
    return (
      <div className="rounded-[18px] bg-ice p-4 text-sm">
        <p className="font-semibold">
          Quote sent: {formatUsdExact(order.priceUsd)}
          {order.dueAt && <>, due {formatDay(order.dueAt)}</>}
        </p>
        <p className="mt-0.5 text-muted">
          Waiting on {name} to pay. They pay with Stripe, and the money lands in your own Stripe account.
          {order.proposalExpiresAt && <> The quote expires {formatLongDate(order.proposalExpiresAt)}, and the slot comes back if it does.</>}
        </p>
        {order.payouts && order.payouts !== "active" && (
          <p className="mt-2 rounded-[10px] bg-star/25 px-3 py-2 text-ink">
            <span className="font-semibold">{name} can&apos;t pay yet:</span>{" "}
            {order.payouts === "none" ? "set up payouts first." : "finish setting up payouts first."}{" "}
            <Link href="/studio#payouts" className="font-semibold underline underline-offset-4">
              {order.payouts === "none" ? "Set up payouts" : "Open payouts"}
            </Link>
          </p>
        )}
        {order.quoteNote && <p className="mt-2 rounded-[10px] bg-surface px-3 py-2 text-ink/85">&ldquo;{order.quoteNote}&rdquo;</p>}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(order, () => declineRequest(order.id, "The artist withdrew the quote."), { archived: true, declined: true }, `Withdrew the quote for ${name}`)}
          className="mt-3 text-xs font-semibold text-muted underline-offset-4 hover:text-danger hover:underline"
        >
          Withdraw the quote
        </button>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="rounded-[18px] bg-ice p-4">
        <p className="text-sm font-semibold">Paid{order.paidAt && <> {formatDay(order.paidAt)}</>}. Up next.</p>
        <p className="mt-0.5 text-sm text-muted">Start when it&apos;s its turn; {name} sees it move onto your easel.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(order, () => startOrder(order.id), { lane: "wip", step: "sketch" }, `Started ${name}'s piece`)}
          className={buttonClasses({ size: "lg", className: "mt-3 w-full" })}
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          Start sketching
        </button>
        <Refund order={order} />
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <>
        <Deliver order={order} pending={pending} run={run} />
        <div className="px-4">
          <Refund order={order} />
        </div>
      </>
    );
  }

  if (status === "delivered" && order.delivery) {
    return (
      <div className="rounded-[18px] bg-ice p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PackageCheck aria-hidden className="size-4 text-mint-strong" />
          Delivered{order.deliveredAt && <> {formatDay(order.deliveredAt)}</>}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {order.delivery.images.map((image) => (
            <span key={image.src} className="relative block aspect-square overflow-hidden rounded-[10px] bg-surface">
              <Image src={image.src} alt={image.alt} fill sizes="200px" className="object-contain" />
            </span>
          ))}
        </div>
        {order.delivery.note && <p className="mt-2 text-sm text-muted">&ldquo;{order.delivery.note}&rdquo;</p>}
      </div>
    );
  }

  return null;
}

type Run = ReturnType<typeof useLiveAction>[1];

/**
 * Gives the buyer's money back before delivering (can't make it, ran out of
 * time, they asked): the order closes, the slot comes back, the buyer is told
 * with your note. Stripe keeps its processing fee.
 */
function Refund({ order }: { order: QueueOrder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const name = order.client.name;
  const amount = order.charged?.amount ?? formatUsdExact(order.priceUsd);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted underline-offset-4 hover:text-danger hover:underline"
      >
        <Undo2 aria-hidden className="size-3.5" />
        Refund {name}
      </button>
    );
  }
  return (
    <div className="mt-3 grid gap-2 rounded-[14px] border border-dashed border-border bg-surface p-3 text-sm">
      <p className="font-semibold">Refund {amount} to {name}?</p>
      <p className="text-muted">
        The order closes and the slot goes back to the service. Stripe keeps its processing fee, and the refund comes out of your Stripe
        balance.
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder={`A word for ${name} (optional)`}
        className={`${inputClass} resize-none py-2`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await refundOrder(order.id, note);
              if (!result.ok) showToast({ message: result.error });
              else {
                showToast({
                  message: result.pending
                    ? `Refund requested: your Stripe balance can't cover it yet, so it goes through as soon as it can.`
                    : `Refunded ${name}`,
                });
                setOpen(false);
              }
              router.refresh();
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-action bg-danger px-3.5 text-sm font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:opacity-50"
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          Refund {amount}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Keep the order
        </button>
      </div>
    </div>
  );
}

/** Yes (a quote), later (waitlist) or no (decline, with an optional word). */
function Answer({ order, today, pending, run }: { order: QueueOrder; today: string; pending: boolean; run: Run }) {
  const id = useId();
  const name = order.client.name;
  const defaultDue = order.dueAt?.slice(0, 10) ?? new Date(Date.parse(`${today}T12:00:00Z`) + 14 * DAY).toISOString().slice(0, 10);
  const [price, setPrice] = useState(String(order.priceUsd || ""));
  const [due, setDue] = useState(defaultDue);
  const [days, setDays] = useState(3);
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-[18px] bg-ice p-4">
      <p className="text-sm font-semibold">{order.waitlist ? `${name} is on your waitlist` : "Take this one on?"}</p>
      <p className="mt-0.5 text-sm text-muted">
        Send a quote: the final price and when you&apos;ll deliver. {name} pays it once checkout opens.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            order,
            () => quoteRequest(order.id, { priceUsd: Number(price), dueDate: due, note, expiresInDays: days }),
            { lane: "proposal", payment: "invoiced", waitlist: false },
            `Quote sent to ${name}`,
          );
        }}
        className="mt-3 grid gap-3"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
          <label className="text-xs font-semibold text-ink">
            Price
            <span className="relative mt-1 block">
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">$</span>
              <input
                inputMode="decimal"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                className={`${inputClass} h-10 pl-6 font-semibold tabular-nums`}
              />
            </span>
          </label>
          <label className="text-xs font-semibold text-ink">
            Delivered by
            <input type="date" required min={today} value={due} onChange={(e) => setDue(e.target.value)} className={`${inputClass} mt-1 h-10`} />
          </label>
        </div>
        <label className="text-xs font-semibold text-ink" htmlFor={`${id}-note`}>
          A note for {name} <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's included, how many revisions, when you'll send the sketch…"
          className={`${inputClass} -mt-2 resize-y py-2`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
            Expires in
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} h-8 w-auto text-xs`}>
              {[1, 3, 7, 14].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className={buttonClasses({ size: "sm", className: "ml-auto" })}>
            {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            Send quote
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
        {!order.waitlist && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(order, () => waitlistRequest(order.id), { waitlist: true }, `Moved ${name} to the waitlist`)}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Waitlist
          </button>
        )}
        {declining ? (
          <span className="flex w-full flex-wrap items-center gap-2">
            <input
              aria-label={`Why (optional), ${name} sees it`}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`A kind word for ${name} (optional)`}
              className={`${inputClass} h-9 min-w-48 flex-1`}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => run(order, () => declineRequest(order.id, reason), { archived: true, declined: true }, `Declined ${name}'s request`)}
              className="h-9 rounded-full bg-danger px-3 text-sm font-semibold text-white"
            >
              Decline
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setDeclining(true)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Decline
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The finished files (up to four) and a note; then it's delivered. When the
 * order holds a slot on its service, the artist can give that slot back as
 * they deliver (optional, off by default).
 */
function Deliver({ order, pending, run }: { order: QueueOrder; pending: boolean; run: Run }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<EditableImage[]>([]);
  const [note, setNote] = useState("");
  const [slotBack, setSlotBack] = useState(false);
  const name = order.client.name;
  const slot = order.slot;

  if (!open) {
    return (
      <div className="rounded-[18px] bg-ice p-4">
        <p className="text-sm font-semibold">On the easel</p>
        <p className="mt-0.5 text-sm text-muted">Click the paint strokes below as you go; {name} sees each step. Deliver when it&apos;s done.</p>
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses({ size: "lg", className: "mt-3 w-full" })}>
          <PackageCheck aria-hidden />
          Deliver
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (images.length === 0) return showToast({ message: "Add the finished piece first." });
        run(
          order,
          // The thumb and the original go along with each file, to be checked and kept (not the preview URL).
          () =>
            deliverOrder(order.id, {
              images: images.map(({ path, width, height, palette, thumb, original }) => ({ path, width, height, palette, thumb, original })),
              note,
              slotBack: Boolean(slot && slotBack),
            }),
          { lane: "delivered", step: "render" },
          slot && slotBack ? `Delivered ${name}'s piece ✓ · 1 slot back on “${slot.service}”` : `Delivered ${name}'s piece ✓`,
          () => setOpen(false),
        );
      }}
      className="grid gap-3 rounded-[18px] bg-ice p-4"
    >
      <p className="text-sm font-semibold">Deliver to {name}</p>
      <ListingImages label="Finished files" value={images} onChange={setImages} max={4} coverLabel="Main" folder="deliveries" />
      <textarea
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`A note for ${name} (optional)`}
        aria-label={`A note for ${name}`}
        className={`${inputClass} resize-y py-2`}
      />
      {slot && (
        <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-border bg-surface px-3.5 py-3 text-sm transition-colors has-checked:border-ocean has-focus-visible:outline-2 has-focus-visible:outline-ocean">
          <input
            type="checkbox"
            checked={slotBack}
            onChange={(e) => setSlotBack(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-ocean"
          />
          <span>
            <span className="font-semibold text-ink">Add 1 slot back to “{slot.service}”</span>{" "}
            <span className="text-muted">(optional)</span>
            <span className="mt-0.5 block text-xs text-muted">
              {slot.taken} of {slot.total} slots taken now
              {slot.taken >= slot.total ? "; it reopens for requests." : `; ${Math.max(0, slot.taken - 1)} of ${slot.total} after.`}
            </span>
          </span>
        </label>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Not yet
        </button>
        <button type="submit" disabled={pending || images.length === 0} className={buttonClasses({ size: "sm" })}>
          {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <PackageCheck aria-hidden />}
          Deliver
        </button>
      </div>
    </form>
  );
}
