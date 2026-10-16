/*
 * Payments, the rules (pure and client-safe; tested in rules.test.ts). Every
 * sale is charged on the artist's own Stripe account ("direct charge"): the
 * money goes straight to them, Stripe takes its processing fee there, and
 * Artiflow's platform fee is 0% during the founding artists' offer
 * (src/lib/plans.ts). See supabase/migrations/*_payments.sql and the
 * payments section of CLAUDE.md.
 */

/** Countries Stripe takes payments in (its country specs, 2026-10-16), minus India (invite only). */
export const PAYOUT_COUNTRIES = [
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["BE", "Belgium"],
  ["BR", "Brazil"],
  ["BG", "Bulgaria"],
  ["CA", "Canada"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["CZ", "Czech Republic"],
  ["DK", "Denmark"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GI", "Gibraltar"],
  ["GR", "Greece"],
  ["HK", "Hong Kong"],
  ["HU", "Hungary"],
  ["IE", "Ireland"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["LV", "Latvia"],
  ["LI", "Liechtenstein"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MY", "Malaysia"],
  ["MT", "Malta"],
  ["MX", "Mexico"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NO", "Norway"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["RO", "Romania"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ES", "Spain"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TH", "Thailand"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
] as const;

export type PayoutCountry = (typeof PAYOUT_COUNTRIES)[number][0];

export const isPayoutCountry = (value: unknown): value is PayoutCountry =>
  PAYOUT_COUNTRIES.some(([code]) => code === value);

export const countryName = (code: string) => PAYOUT_COUNTRIES.find(([c]) => c === code)?.[1] ?? code;

/**
 * Where an artist's payouts stand. incomplete: they haven't finished Stripe's
 * form; review: Stripe is checking what they sent; active: buyers can pay
 * them; unsupported: Stripe can't take payments for them.
 */
export type PayoutStatus = "incomplete" | "review" | "active" | "unsupported";

/**
 * From a Stripe account: its card payments capability ("active", "pending",
 * "restricted", "unsupported") and whether Stripe is waiting on the artist.
 */
export function payoutStatusOf(capability: string | undefined, awaitingArtist: boolean): PayoutStatus {
  if (capability === "active") return "active";
  if (capability === "unsupported") return "unsupported";
  if (capability === "pending") return "review";
  return awaitingArtist || !capability ? "incomplete" : "review";
}

/**
 * The currencies a buyer can pay an artist in. Stripe only charges cards
 * issued in Brazil in reais when the artist is in Brazil ("You can only
 * charge Brazilian cards in BRL in Brazil"), so artists there take reais
 * as well as dollars; everyone else takes dollars.
 */
export type PayCurrency = "usd" | "brl";

export const currenciesFor = (artistCountry: string): PayCurrency[] => (artistCountry === "BR" ? ["brl", "usd"] : ["usd"]);

/** The price in the currency charged, in its smallest unit (cents, centavos). */
export function amountIn(priceUsd: number, currency: PayCurrency, usdToBrl?: number): number {
  if (currency === "usd") return Math.round(priceUsd * 100);
  if (!usdToBrl || !(usdToBrl > 0)) throw new Error("No dollar rate for reais");
  return Math.round(priceUsd * usdToBrl * 100);
}

/** Stripe's Checkout pages last between 30 minutes and 24 hours: we hold the quote (or adoptable) for 30. */
export const CHECKOUT_MINUTES = 30;

/** When a checkout opened now closes (Stripe needs a little more than its 30-minute minimum). */
export const checkoutExpiry = (nowMs: number) => nowMs + (CHECKOUT_MINUTES + 1) * 60_000;

export type OrderState = "pending" | "waitlisted" | "quoted" | "paid" | "in_progress" | "delivered" | "declined" | "cancelled" | "expired" | "refunded";

/**
 * A payment for a commission just went through: what to do with the order.
 * `paidBy` is the payment the order is already paid with, if any. A payment
 * for an order that moved on (cancelled while the buyer paid, or paid twice)
 * goes back to the buyer.
 */
export function settleCommission(order: { status: OrderState; paidBy?: string | null }, paymentId: string): "pay" | "already" | "refund" {
  if (order.status === "quoted") return "pay";
  if (order.paidBy === paymentId && ["paid", "in_progress", "delivered"].includes(order.status)) return "already";
  return "refund";
}

/** The same for an adoptable: it's sold once, to the first payment that lands. */
export function settleAdoption(adoptable: { status: "available" | "reserved" | "sold"; soldBy?: string | null }, paymentId: string): "sell" | "already" | "refund" {
  if (adoptable.soldBy === paymentId) return "already";
  if (adoptable.status === "sold") return "refund";
  return "sell";
}

/**
 * Whether a buyer can start paying for an adoptable now: not sold, not on the
 * artist's own hold, and not in someone else's checkout.
 */
export function adoptableOpen(adoptable: { status: string; checkoutUntil?: string | null }, nowMs: number): "open" | "sold" | "held" | "in_checkout" {
  if (adoptable.status === "sold") return "sold";
  if (adoptable.status === "reserved") return "held";
  if (adoptable.checkoutUntil && new Date(adoptable.checkoutUntil).getTime() > nowMs) return "in_checkout";
  return "open";
}

/** "$12.50", "R$ 63,20": an amount in its smallest unit, in its own currency's format. */
export function formatMoney(cents: number, currency: string): string {
  const code = currency.toUpperCase();
  return new Intl.NumberFormat(code === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency: code }).format(cents / 100);
}

/**
 * Where a payment's refunds stand, from Stripe's refunds for it. A refund
 * waits ("pending") while the artist's Stripe balance can't cover it, and
 * goes through on its own once it can; failed or cancelled ones don't count.
 */
export function refundState(refunds: { status: string; amount: number }[], amountCents: number): { status: "paid" | "refund_pending" | "refunded"; refundedCents: number } {
  const sum = (statuses: string[]) => refunds.filter((r) => statuses.includes(r.status)).reduce((total, r) => total + r.amount, 0);
  const done = sum(["succeeded"]);
  if (done >= amountCents) return { status: "refunded", refundedCents: done };
  if (sum(["pending", "requires_action"]) > 0) return { status: "refund_pending", refundedCents: done };
  return { status: "paid", refundedCents: done };
}
