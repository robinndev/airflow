/**
 * Listing rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { priceFrom, sortPackages, turnaroundLabel } from "./catalog.ts";
import { mostOpen, slotsLeft, summarizeServices } from "./slots.ts";

describe("turnaroundLabel", () => {
  test("days, weeks and months", () => {
    assert.equal(turnaroundLabel({ min: 5, max: 7 }), "5–7 days");
    assert.equal(turnaroundLabel({ min: 7, max: 14 }), "1–2 weeks");
    assert.equal(turnaroundLabel({ min: 14, max: 14 }), "2 weeks");
    assert.equal(turnaroundLabel({ min: 1, max: 1 }), "1 day");
    assert.equal(turnaroundLabel({ min: 10, max: 10 }), "10 days");
    assert.equal(turnaroundLabel({ min: 56, max: 84 }), "2–3 months");
  });
});

describe("packages", () => {
  test("cheapest first; the from price is the cheapest", () => {
    const packages = [
      { id: "full", priceUsd: 45 },
      { id: "sketch", priceUsd: 20 },
      { id: "line", priceUsd: 33 },
    ];
    assert.deepEqual(sortPackages(packages).map((p) => p.id), ["sketch", "line", "full"]);
    assert.equal(priceFrom(packages), 20);
    assert.equal(priceFrom([]), 0);
  });
});

describe("slots and status", () => {
  test("the profile is as open as its most open service", () => {
    assert.equal(mostOpen(["closed", "waitlist", "open"]), "open");
    assert.equal(mostOpen(["closed", "waitlist"]), "waitlist");
    assert.equal(mostOpen([]), "closed");
  });

  test("slots left; no cap is null", () => {
    assert.equal(slotsLeft({ total: 5, taken: 2 }), 3);
    assert.equal(slotsLeft({ total: 3, taken: 5 }), 0);
    assert.equal(slotsLeft(null), null);
  });

  test("summary counts only services that take requests", () => {
    const base = { turnaround: "", category: "icons" as const };
    const summary = summarizeServices([
      { ...base, status: "open", slots: { total: 5, taken: 2 }, priceFromUsd: 30, turnaroundDays: { min: 7, max: 14 }, turnaround: "1–2 weeks" },
      { ...base, status: "waitlist", slots: null, priceFromUsd: 20, turnaroundDays: { min: 3, max: 5 }, turnaround: "3–5 days" },
      { ...base, status: "closed", slots: { total: 9, taken: 0 }, priceFromUsd: 5, turnaroundDays: { min: 1, max: 1 }, turnaround: "1 day", category: "chibi" },
    ]);
    assert.equal(summary.status, "open");
    assert.equal(summary.slotsTotal, 5);
    assert.equal(summary.slotsTaken, 2);
    assert.equal(summary.startingPriceUsd, 20);
    assert.equal(summary.turnaround, "3–5 days");
    assert.deepEqual(summary.types, ["Icons & portraits", "Chibi"]);
  });
});
