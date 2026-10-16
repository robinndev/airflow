import "server-only";
import Stripe from "stripe";

/*
 * Stripe, server side. Artiflow's Stripe account is the platform (a
 * Brazilian company); artists connect their own Stripe accounts to it and
 * every sale is charged on theirs (src/lib/payments/rules.ts). Keys:
 * STRIPE_SECRET_KEY (sk_test_… until the account is activated) and
 * STRIPE_WEBHOOK_SECRET (whsec_…, the Connect webhook endpoint's).
 */

let client: Stripe | undefined;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Test keys: nothing real moves (Stripe's test cards and test onboarding data). The site says so. */
export const stripeTestMode = () => Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"));

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing (see CLAUDE.md, Payments).");
  client ??= new Stripe(key, { appInfo: { name: "Artiflow" }, maxNetworkRetries: 2 });
  return client;
}

/** Checkout pages, refunds and fees live on the artist's own account. */
export const onAccount = (accountId: string): Stripe.RequestOptions => ({ stripeAccount: accountId });
