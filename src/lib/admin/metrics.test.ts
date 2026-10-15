/**
 * The back office's rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildDashboard, bucketize, changeOf, daysOf, total, type RawDashboard, type RawDay } from "./metrics.ts";
import { adminHref, addDays, parseAdmin, windowOf } from "./range.ts";

const day = (date: string, patch: Partial<RawDay> = {}): RawDay => ({
  day: date,
  signups: 0,
  active: 0,
  posts: 0,
  comments: 0,
  likes: 0,
  follows: 0,
  saves: 0,
  messages: 0,
  uploads: 0,
  requests: 0,
  paid_orders: 0,
  paid_usd: 0,
  adoptions: 0,
  adoption_usd: 0,
  subscribed: 0,
  ...patch,
});

const raw = (series: RawDay[], patch: Partial<RawDashboard> = {}): RawDashboard => ({
  accounts: { total: 0, before: 0, artists: 0, new_artists: 0, verified: 0, subscribers: 0, subscriber_days: 0 },
  unfinished: { unconfirmed: 0, no_handle: 0 },
  active: { today: 0, week: 0, month: 0, range: 0 },
  requests: {
    sent: 0,
    to_demo: 0,
    quoted: 0,
    paid: 0,
    started: 0,
    delivered: 0,
    waiting: 0,
    declined: 0,
    cancelled: 0,
    expired: 0,
    hours_to_quote: null,
    days_to_deliver: null,
  },
  pipeline: { awaiting_payment: 0, awaiting_payment_usd: 0, in_the_works: 0, in_the_works_usd: 0, waiting_on_artist: 0 },
  top_artists: [],
  listings: {
    services_open: 0,
    services_waitlist: 0,
    services_closed: 0,
    studios_open: 0,
    adoptables_available: 0,
    adoptables_reserved: 0,
    adoptables_listed: 0,
  },
  shelves: { posts: 0, pieces: 0, characters: 0, conversations: 0 },
  shop: [],
  shop_daily: [],
  team: [],
  series,
  generated_at: "2026-10-15T12:00:00Z",
  ...patch,
});

describe("the URL", () => {
  test("defaults stay out of it", () => {
    const query = parseAdmin({});
    assert.deepEqual(query, { range: "30d", withoutTeam: false, fee: null });
    assert.equal(adminHref(query), "/admin");
    assert.equal(adminHref(query, { range: "7d", withoutTeam: true, fee: 8 }), "/admin?range=7d&team=out&fee=8");
  });

  test("odd values fall back", () => {
    assert.deepEqual(parseAdmin({ range: "1y", fee: "-3", team: "yes" }), { range: "30d", withoutTeam: false, fee: null });
    assert.equal(parseAdmin({ fee: "99" }).fee, null);
    assert.equal(parseAdmin({ fee: "5.3" }).fee, 5.5);
    assert.equal(parseAdmin({ fee: "0" }).fee, 0);
  });
});

describe("windows", () => {
  test("a period and the one before it", () => {
    assert.deepEqual(windowOf("7d", "2026-10-15"), {
      from: "2026-10-09",
      to: "2026-10-15",
      seriesFrom: "2026-10-02",
      days: 7,
      compare: true,
    });
  });

  test("all time starts at the first account and compares with nothing", () => {
    assert.deepEqual(windowOf("all", "2026-10-15"), {
      from: "2026-10-10",
      to: "2026-10-15",
      seriesFrom: "2026-10-10",
      days: 6,
      compare: false,
    });
  });
});

describe("money", () => {
  test("fees follow the fee, the shop and plans don't", () => {
    const data = raw([day("2026-10-15", { paid_orders: 2, paid_usd: 200, adoptions: 1, adoption_usd: 40 })], {
      shop_daily: [{ day: "2026-10-15", kind: "pin", item: "coffee", n: 2 }],
    });
    const [at5] = daysOf(data, 5);
    assert.equal(at5.values.feeCommissionsUsd, 10);
    assert.equal(at5.values.feeAdoptionsUsd, 2);
    assert.equal(at5.values.shopUsd, 1.98);
    assert.equal(at5.values.gmvUsd, 241.98);
    assert.equal(at5.values.revenueUsd, 13.98);
    const [at10] = daysOf(data, 10);
    assert.equal(at10.values.revenueUsd, 25.98);
  });

  test("members are counted back from today by when they started", () => {
    const data = raw([day("2026-10-13"), day("2026-10-14", { subscribed: 1 }), day("2026-10-15", { subscribed: 2 })], {
      accounts: { total: 9, before: 0, artists: 0, new_artists: 0, verified: 0, subscribers: 4, subscriber_days: 0 },
    });
    assert.deepEqual(
      daysOf(data, 5).map((d) => d.values.subscribers),
      [1, 2, 4],
    );
    // A month of one member is the plan's price.
    const month = Array.from({ length: 365 }, (_, i) => day(addDays("2026-01-01", i)));
    const year = daysOf(raw(month, { accounts: { ...data.accounts, subscribers: 1 } }), 5);
    assert.ok(Math.abs(total(year).plansUsd - 6.99 * 12) < 0.3);
  });
});

describe("points on the charts", () => {
  test("weeks add up, active accounts average and members keep the last day", () => {
    const series = Array.from({ length: 10 }, (_, i) =>
      day(addDays("2026-10-06", i), { signups: 1, active: i < 7 ? 2 : 4, subscribed: i === 0 ? 3 : 0 }),
    );
    const data = raw(series, {
      accounts: { total: 10, before: 0, artists: 0, new_artists: 0, verified: 0, subscribers: 3, subscriber_days: 0 },
    });
    const buckets = bucketize(daysOf(data, 5), "2026-10-06", "2026-10-15", 7);
    assert.equal(buckets.length, 2);
    assert.deepEqual([buckets[0].start, buckets[0].end, buckets[1].end], ["2026-10-06", "2026-10-12", "2026-10-15"]);
    assert.equal(buckets[0].values.signups, 7);
    assert.equal(buckets[1].values.signups, 3);
    assert.equal(buckets[0].values.active, 2);
    assert.equal(buckets[1].values.active, 4);
    assert.equal(buckets[1].values.subscribers, 3);
  });
});

describe("the dashboard", () => {
  test("splits the current period from the one before", () => {
    const window = windowOf("7d", "2026-10-15");
    const series = Array.from({ length: 14 }, (_, i) => day(addDays(window.seriesFrom, i), { signups: i < 7 ? 1 : 2 }));
    const dash = buildDashboard(raw(series), window, 5);
    assert.equal(dash.current.length, 7);
    assert.equal(dash.previous.length, 7);
    assert.equal(dash.totals.signups, 14);
    assert.equal(dash.previousTotals?.signups, 7);
  });

  test("the funnel is a share of the requests sent", () => {
    const window = windowOf("7d", "2026-10-15");
    const data = raw([], { requests: { ...raw([]).requests, sent: 4, quoted: 3, paid: 2, started: 1, delivered: 1 } });
    const dash = buildDashboard(data, window, 5);
    assert.deepEqual(
      dash.funnel.map((step) => step.share),
      [1, 0.75, 0.5, 0.25, 0.25],
    );
  });

  test("the shop: bought items earn, monthly picks are worth their price", () => {
    const window = windowOf("30d", "2026-10-15");
    const data = raw([], {
      shop: [
        { kind: "effect", item: "starfall", source: "purchase", n: 2 },
        { kind: "effect", item: "starfall", source: "monthly", n: 1 },
        { kind: "effect", item: "petals", source: "claim", n: 5 },
      ],
    });
    const row = buildDashboard(data, window, 5).shop.find((r) => r.kind === "effect");
    assert.deepEqual(
      { claimed: row?.claimed, bought: row?.bought, picks: row?.picks, revenue: row?.revenueUsd, worth: row?.picksWorthUsd },
      { claimed: 5, bought: 2, picks: 1, revenue: 7.98, worth: 3.99 },
    );
  });
});

describe("changes", () => {
  test("against the period before", () => {
    assert.deepEqual(changeOf(15, 10), { direction: "up", pct: 50 });
    assert.deepEqual(changeOf(5, 10), { direction: "down", pct: -50 });
    assert.deepEqual(changeOf(3, 0), { direction: "up", pct: null });
    assert.deepEqual(changeOf(0, 0), { direction: "flat", pct: 0 });
    assert.equal(changeOf(3, null), null);
  });
});
