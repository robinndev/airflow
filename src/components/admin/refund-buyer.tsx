"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { checkRefund, refundBuyer } from "@/app/(site)/admin/payments/actions";
import { showToast } from "@/components/favorites/toast-events";
import { inputClass } from "@/components/studio/fields";
import { buttonClasses } from "@/components/ui/button";

/**
 * "Refund buyer": the team gives a buyer their money back (an artist who
 * vanished, a delivery that wasn't what was paid for). Says why, in words the
 * buyer reads; says plainly where the money comes from.
 */
export function RefundBuyer({ id, amount, buyer, artist }: { id: string; amount: string; buyer?: string; artist?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <Undo2 aria-hidden />
        Refund buyer
      </button>
    );
  }
  return (
    <div className="grid w-full gap-2 rounded-[14px] border border-dashed border-border bg-ice/50 p-3 text-sm">
      <p className="font-semibold text-ink">
        Refund {amount} to {buyer ? `@${buyer}` : "the buyer"}?
      </p>
      <p className="text-muted">
        It comes out of {artist ? `@${artist}'s` : "the artist's"} Stripe balance, not ours. If their balance is short, the refund waits
        there and goes through on its own when it can; the buyer&apos;s bank stays the way out (a chargeback). The order closes as refunded.
      </p>
      <label className="grid gap-1">
        <span className="font-semibold text-ink">Why (the buyer reads it)</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="The artist didn't deliver and stopped answering."
          className={`${inputClass} resize-none py-2`}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || reason.trim().length < 5}
          onClick={() =>
            start(async () => {
              const result = await refundBuyer(id, reason);
              if (!result.ok) showToast({ message: result.error });
              else {
                showToast({ message: result.pending ? "Refund requested: it waits on the artist's Stripe balance." : `Refunded ${amount}.` });
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
          Keep it
        </button>
      </div>
    </div>
  );
}

/** A refund waiting on the artist's balance: ask Stripe again. */
export function CheckRefund({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await checkRefund(id);
          showToast({
            message: !result.ok ? result.error : result.status === "refunded" ? "It went through: refunded." : "Still waiting on the artist's balance.",
          });
          router.refresh();
        })
      }
      className={buttonClasses({ variant: "ghost", size: "sm" })}
    >
      {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
      Check with Stripe
    </button>
  );
}
