"use client";

import { usePathname, useRouter } from "next/navigation";
import { Lock, LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { adoptCharacter, payForOrder } from "@/app/(site)/payment-actions";
import { showToast } from "@/components/favorites/toast-events";
import { buttonClasses } from "@/components/ui/button";
import type { PayCurrency } from "@/lib/payments/rules";

export type PayOption = { currency: PayCurrency; amount: string };

const WHO_PAYS: Record<PayCurrency, string> = { brl: "cards from Brazil", usd: "cards from anywhere" };

/**
 * Pays a quote (or adopts) on Stripe's own page, made on the artist's Stripe
 * account. One button per currency the artist takes: artists in Brazil take
 * reais too, since Stripe charges Brazilian cards only in reais there.
 */
export function PayButton({
  kind,
  id,
  options,
  verb = "Pay",
  size = "md",
  test = false,
  className = "",
}: {
  kind: "commission" | "adoption";
  id: string;
  options: PayOption[];
  verb?: string;
  size?: "md" | "lg";
  /** Stripe's test mode: say so, with the test card. */
  test?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const pay = (currency: PayCurrency) =>
    start(async () => {
      const result = await (kind === "commission" ? payForOrder(id, currency) : adoptCharacter(id, currency));
      if (result.ok) window.location.assign(result.url);
      else if (result.signIn) router.push(`/sign-in?next=${encodeURIComponent(`${path}${window.location.hash}`)}`);
      else showToast({ message: result.error });
    });
  const [first, ...others] = options;
  if (!first) return null;
  const several = options.length > 1;

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={pending}
        onClick={() => pay(first.currency)}
        className={buttonClasses({ size: size === "lg" ? "lg" : "md", className: `${size === "lg" ? "h-12 w-full" : ""} rounded-full` })}
      >
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Lock aria-hidden />}
        {verb} {first.amount}
        {several && <span className="font-normal opacity-80">· {WHO_PAYS[first.currency]}</span>}
      </button>
      {others.map((option) => (
        <button
          key={option.currency}
          type="button"
          disabled={pending}
          onClick={() => pay(option.currency)}
          className="justify-self-start text-xs font-semibold underline-offset-4 opacity-75 hover:underline hover:opacity-100 disabled:opacity-40"
        >
          or {verb.toLowerCase()} {option.amount} · {WHO_PAYS[option.currency]}
        </button>
      ))}
      {test && (
        <p className="text-xs opacity-80">
          <span className="rounded-[4px] bg-star/40 px-1 font-semibold">Test mode</span> No real money: pay with 4242 4242 4242 4242, any future date,
          any CVC.
        </p>
      )}
    </div>
  );
}
