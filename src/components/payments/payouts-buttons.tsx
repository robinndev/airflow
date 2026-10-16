"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { continuePayouts, startPayouts } from "@/app/(site)/payment-actions";
import { showToast } from "@/components/favorites/toast-events";
import { inputClass } from "@/components/studio/fields";
import { buttonClasses } from "@/components/ui/button";
import { PAYOUT_COUNTRIES } from "@/lib/payments/rules";

/** Runs an action that answers with a Stripe page, then goes there. */
function useStripeRedirect() {
  const [pending, start] = useTransition();
  function go(action: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>) {
    start(async () => {
      const result = await action();
      if (result.ok) window.location.assign(result.url);
      else showToast({ message: result.error });
    });
  }
  return [pending, go] as const;
}

/** First time: where the artist lives (Stripe can't change it later), then Stripe's form. */
export function SetUpPayouts({ defaultCountry }: { defaultCountry?: string }) {
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [pending, go] = useStripeRedirect();
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!country) return showToast({ message: "Pick the country you live in." });
        go(() => startPayouts(country));
      }}
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-ink">Country you live in</span>
        <select value={country} onChange={(event) => setCountry(event.target.value)} className={`${inputClass} h-11 min-w-56`} required>
          <option value="" disabled>
            Pick a country
          </option>
          {PAYOUT_COUNTRIES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={buttonClasses({ size: "lg" })}>
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
        Set up payouts with Stripe
        {!pending && <ArrowRight aria-hidden />}
      </button>
      <p className="w-full text-xs text-muted">
        Stripe can&apos;t change the country later. Not on the list? Stripe doesn&apos;t take payments there yet.
      </p>
    </form>
  );
}

/** Back to Stripe's form, to finish or update what it asked for. */
export function ContinuePayouts({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  const [pending, go] = useStripeRedirect();
  return (
    <button type="button" disabled={pending} onClick={() => go(continuePayouts)} className={buttonClasses({ variant, size: "lg", className: "mt-4" })}>
      {pending && <LoaderCircle aria-hidden className="animate-spin" />}
      {label}
      {!pending && <ArrowRight aria-hidden />}
    </button>
  );
}
