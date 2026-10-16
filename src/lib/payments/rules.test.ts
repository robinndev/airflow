import assert from "node:assert/strict";
import { test } from "node:test";
import { FEE_FREE, PLATFORM_FEE_PERCENT, platformFeePercent } from "../plans.ts";
import {
  adoptableOpen,
  amountIn,
  checkoutExpiry,
  CHECKOUT_MINUTES,
  currenciesFor,
  formatMoney,
  isPayoutCountry,
  payoutStatusOf,
  refundState,
  settleAdoption,
  settleCommission,
} from "./rules.ts";

test("no platform fee through the founding artists' offer, then the usual fee", () => {
  assert.equal(platformFeePercent("2026-10-16"), 0);
  assert.equal(platformFeePercent(FEE_FREE.until), 0);
  assert.equal(platformFeePercent("2027-11-01"), PLATFORM_FEE_PERCENT);
  assert.equal(platformFeePercent(new Date("2028-01-01T00:00:00Z")), PLATFORM_FEE_PERCENT);
});

test("payout status follows Stripe's card payments capability", () => {
  assert.equal(payoutStatusOf("active", false), "active");
  assert.equal(payoutStatusOf("active", true), "active");
  assert.equal(payoutStatusOf("pending", false), "review");
  assert.equal(payoutStatusOf("restricted", true), "incomplete");
  assert.equal(payoutStatusOf("restricted", false), "review");
  assert.equal(payoutStatusOf(undefined, false), "incomplete");
  assert.equal(payoutStatusOf("unsupported", true), "unsupported");
});

test("artists in Brazil take reais and dollars; everyone else dollars", () => {
  assert.deepEqual(currenciesFor("BR"), ["brl", "usd"]);
  assert.deepEqual(currenciesFor("US"), ["usd"]);
  assert.ok(isPayoutCountry("JP"));
  assert.ok(!isPayoutCountry("IN"));
  assert.ok(!isPayoutCountry("PH"));
});

test("the amount charged, in the smallest unit", () => {
  assert.equal(amountIn(55, "usd"), 5500);
  assert.equal(amountIn(12.5, "usd"), 1250);
  assert.equal(amountIn(100, "brl", 5.0826), 50826);
  assert.equal(amountIn(19.99, "brl", 5.1), 10195);
  assert.throws(() => amountIn(10, "brl"));
});

test("a checkout stays open a little longer than Stripe's 30-minute minimum", () => {
  const now = Date.UTC(2026, 9, 16, 12);
  assert.ok(checkoutExpiry(now) - now > CHECKOUT_MINUTES * 60_000);
  assert.ok(checkoutExpiry(now) - now < 24 * 3_600_000);
});

test("a commission is paid once; a payment for an order that moved on goes back", () => {
  assert.equal(settleCommission({ status: "quoted" }, "p1"), "pay");
  assert.equal(settleCommission({ status: "paid", paidBy: "p1" }, "p1"), "already");
  assert.equal(settleCommission({ status: "in_progress", paidBy: "p1" }, "p1"), "already");
  assert.equal(settleCommission({ status: "paid", paidBy: "p1" }, "p2"), "refund");
  assert.equal(settleCommission({ status: "cancelled" }, "p1"), "refund");
  assert.equal(settleCommission({ status: "expired" }, "p1"), "refund");
  assert.equal(settleCommission({ status: "refunded", paidBy: "p1" }, "p1"), "refund");
});

test("an adoptable is sold to the first payment that lands", () => {
  assert.equal(settleAdoption({ status: "available" }, "p1"), "sell");
  assert.equal(settleAdoption({ status: "reserved" }, "p1"), "sell");
  assert.equal(settleAdoption({ status: "sold", soldBy: "p1" }, "p1"), "already");
  assert.equal(settleAdoption({ status: "sold", soldBy: "p1" }, "p2"), "refund");
  assert.equal(settleAdoption({ status: "sold" }, "p2"), "refund");
});

test("an adoptable can be paid for unless it's sold, held or in someone's checkout", () => {
  const now = Date.UTC(2026, 9, 16, 12);
  assert.equal(adoptableOpen({ status: "available" }, now), "open");
  assert.equal(adoptableOpen({ status: "sold" }, now), "sold");
  assert.equal(adoptableOpen({ status: "reserved" }, now), "held");
  assert.equal(adoptableOpen({ status: "available", checkoutUntil: new Date(now + 60_000).toISOString() }, now), "in_checkout");
  assert.equal(adoptableOpen({ status: "available", checkoutUntil: new Date(now - 60_000).toISOString() }, now), "open");
});

test("money in its own currency", () => {
  assert.equal(formatMoney(5500, "usd"), "$55.00");
  assert.equal(formatMoney(50826, "brl").replace(/\s/g, " "), "R$ 508,26");
});

test("a refund waits while the artist's balance can't cover it", () => {
  assert.deepEqual(refundState([], 2500), { status: "paid", refundedCents: 0 });
  assert.deepEqual(refundState([{ status: "pending", amount: 2500 }], 2500), { status: "refund_pending", refundedCents: 0 });
  assert.deepEqual(refundState([{ status: "succeeded", amount: 2500 }], 2500), { status: "refunded", refundedCents: 2500 });
  // A failed refund doesn't count: the payment stands.
  assert.deepEqual(refundState([{ status: "failed", amount: 2500 }], 2500), { status: "paid", refundedCents: 0 });
  assert.deepEqual(refundState([{ status: "canceled", amount: 2500 }, { status: "succeeded", amount: 2500 }], 2500), {
    status: "refunded",
    refundedCents: 2500,
  });
  // Part given back, the rest still on its way.
  assert.deepEqual(refundState([{ status: "succeeded", amount: 1000 }, { status: "pending", amount: 1500 }], 2500), {
    status: "refund_pending",
    refundedCents: 1000,
  });
});
