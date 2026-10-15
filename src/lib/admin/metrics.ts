import type { ItemKind } from "@/lib/shop/catalog";
import { KINDS, KIND_ORDER, itemOf } from "../shop/catalog.ts";
import { PLANS } from "../plans.ts";
import { addDays, bucketDaysOf, daysBetween, type Window } from "./range.ts";

/*
 * The back office's numbers (/admin), from what `admin_dashboard()` returns.
 * Pure and client-safe, tested in metrics.test.ts. The database counts; this
 * turns counts into money with the app's own prices: the platform fee, the
 * plans and the shop's catalog. Until checkout exists every money figure is
 * an estimate (orders the team marked paid, adoptables their artists marked
 * sold, plans the team gave).
 */

// What the database sends ------------------------------------------------------

export type RawDay = {
  day: string;
  signups: number;
  active: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
  saves: number;
  messages: number;
  uploads: number;
  requests: number;
  paid_orders: number;
  paid_usd: number;
  adoptions: number;
  adoption_usd: number;
  subscribed: number;
};

export type RawDashboard = {
  accounts: {
    total: number;
    before: number;
    artists: number;
    new_artists: number;
    verified: number;
    subscribers: number;
    subscriber_days: number;
  };
  unfinished: { unconfirmed: number; no_handle: number };
  active: { today: number; week: number; month: number; range: number };
  requests: {
    sent: number;
    to_demo: number;
    quoted: number;
    paid: number;
    started: number;
    delivered: number;
    waiting: number;
    declined: number;
    cancelled: number;
    expired: number;
    hours_to_quote: number | null;
    days_to_deliver: number | null;
  };
  pipeline: {
    awaiting_payment: number;
    awaiting_payment_usd: number;
    in_the_works: number;
    in_the_works_usd: number;
    waiting_on_artist: number;
  };
  top_artists: { handle: string; name: string; orders: number; usd: number }[];
  listings: {
    services_open: number;
    services_waitlist: number;
    services_closed: number;
    studios_open: number;
    adoptables_available: number;
    adoptables_reserved: number;
    adoptables_listed: number;
  };
  shelves: { posts: number; pieces: number; characters: number; conversations: number };
  shop: { kind: ItemKind; item: string; source: "claim" | "purchase" | "gift" | "monthly"; n: number }[];
  shop_daily: { day: string; kind: ItemKind; item: string; n: number }[];
  team: { handle: string; name: string; role: "admin" | "moderator" }[];
  series: RawDay[];
  generated_at: string;
};

// Days, with money -----------------------------------------------------------

export type Values = {
  signups: number;
  /** Accounts that opened Artiflow that day (a bucket averages it). */
  active: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
  saves: number;
  messages: number;
  uploads: number;
  requests: number;
  paidOrders: number;
  commissionsUsd: number;
  adoptions: number;
  adoptionsUsd: number;
  shopSales: number;
  shopUsd: number;
  /** Paying members that day (a bucket keeps its last day). */
  subscribers: number;
  /** Plans that started that day. */
  newMembers: number;
  plansUsd: number;
  /** Everything buyers paid through Artiflow: commissions, adoptables, shop. */
  gmvUsd: number;
  feeCommissionsUsd: number;
  feeAdoptionsUsd: number;
  /** What Artiflow keeps: fees, the shop and plans. */
  revenueUsd: number;
};

export type Metric = keyof Values;

/** A plan's price spread over the days of an average month. */
const DAYS_PER_MONTH = 365.25 / 12;

/**
 * Every plan in the database is Flow+ today (`profiles.plan`: free | flow_plus);
 * the Live tier joins this once it can be bought.
 */
const PLAN_PRICE_USD = PLANS.flow_plus.priceUsd;

export const priceOf = (kind: ItemKind, id: string) => itemOf(kind, id)?.priceUsd ?? 0;

/** The daily series in money: fees at `feePercent`, plans day by day, shop sales at catalog prices. */
export function daysOf(raw: RawDashboard, feePercent: number): { day: string; values: Values }[] {
  const shopByDay = new Map<string, { n: number; usd: number }>();
  for (const sale of raw.shop_daily) {
    const day = shopByDay.get(sale.day) ?? { n: 0, usd: 0 };
    day.n += sale.n;
    day.usd += sale.n * priceOf(sale.kind, sale.item);
    shopByDay.set(sale.day, day);
  }

  // Today's members, counted back by when their plan started (cancellations aren't kept yet).
  const startedInSeries = raw.series.reduce((sum, day) => sum + day.subscribed, 0);
  let subscribers = Math.max(0, raw.accounts.subscribers - startedInSeries);
  const rate = feePercent / 100;

  return raw.series.map((day) => {
    subscribers += day.subscribed;
    const shop = shopByDay.get(day.day) ?? { n: 0, usd: 0 };
    const plansUsd = (subscribers * PLAN_PRICE_USD) / DAYS_PER_MONTH;
    const feeCommissionsUsd = day.paid_usd * rate;
    const feeAdoptionsUsd = day.adoption_usd * rate;
    return {
      day: day.day,
      values: {
        signups: day.signups,
        active: day.active,
        posts: day.posts,
        comments: day.comments,
        likes: day.likes,
        follows: day.follows,
        saves: day.saves,
        messages: day.messages,
        uploads: day.uploads,
        requests: day.requests,
        paidOrders: day.paid_orders,
        commissionsUsd: day.paid_usd,
        adoptions: day.adoptions,
        adoptionsUsd: day.adoption_usd,
        shopSales: shop.n,
        shopUsd: shop.usd,
        subscribers,
        newMembers: day.subscribed,
        plansUsd,
        gmvUsd: day.paid_usd + day.adoption_usd + shop.usd,
        feeCommissionsUsd,
        feeAdoptionsUsd,
        revenueUsd: feeCommissionsUsd + feeAdoptionsUsd + shop.usd + plansUsd,
      },
    };
  });
}

const zero = (): Values => ({
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
  paidOrders: 0,
  commissionsUsd: 0,
  adoptions: 0,
  adoptionsUsd: 0,
  shopSales: 0,
  shopUsd: 0,
  subscribers: 0,
  newMembers: 0,
  plansUsd: 0,
  gmvUsd: 0,
  feeCommissionsUsd: 0,
  feeAdoptionsUsd: 0,
  revenueUsd: 0,
});

/** Days added up: sums, except active accounts (the average day) and members (the last day). */
export function total(days: { values: Values }[]): Values {
  const sum = zero();
  for (const { values } of days) {
    for (const key of Object.keys(sum) as Metric[]) sum[key] += values[key];
  }
  if (days.length) {
    sum.active /= days.length;
    sum.subscribers = days[days.length - 1].values.subscribers;
  }
  return sum;
}

export type Bucket = {
  /** First and last day it covers, inclusive. */
  start: string;
  end: string;
  values: Values;
};

/** Days grouped into points: one a day, or a week each (the last one may be short). */
export function bucketize(days: { day: string; values: Values }[], from: string, to: string, size: number): Bucket[] {
  const inside = days.filter((d) => d.day >= from && d.day <= to);
  const buckets: Bucket[] = [];
  for (let i = 0; i < inside.length; i += size) {
    const chunk = inside.slice(i, i + size);
    buckets.push({ start: chunk[0].day, end: chunk[chunk.length - 1].day, values: total(chunk) });
  }
  return buckets;
}

// Comparisons -------------------------------------------------------------------

export type Change = { direction: "up" | "down" | "flat"; /** Percent; null when there was nothing before. */ pct: number | null };

export function changeOf(current: number, previous: number | null): Change | null {
  if (previous === null) return null;
  const eps = 1e-9;
  if (Math.abs(current - previous) < eps) return { direction: "flat", pct: 0 };
  if (Math.abs(previous) < eps) return { direction: "up", pct: null };
  const pct = ((current - previous) / previous) * 100;
  return { direction: pct > 0 ? "up" : "down", pct };
}

// The dashboard ----------------------------------------------------------------

export type ReceiptLine = {
  id: "commissions" | "adoptables" | "shop" | "plans";
  label: string;
  /** What it's a cut of, when it's a fee. */
  basisUsd: number | null;
  usd: number;
  count: number;
};

export type FunnelStep = { id: string; label: string; n: number; /** Of the requests sent. */ share: number };

export type ShopRow = {
  kind: ItemKind;
  label: string;
  claimed: number;
  bought: number;
  picks: number;
  gifts: number;
  revenueUsd: number;
  /** What the Flow+ monthly picks would have cost. */
  picksWorthUsd: number;
};

export type Dashboard = {
  window: Window;
  bucketDays: number;
  feePercent: number;
  current: Bucket[];
  /** The period before, same length (empty for "All time"). */
  previous: Bucket[];
  totals: Values;
  previousTotals: Values | null;
  receipt: ReceiptLine[];
  accounts: RawDashboard["accounts"] & { collectors: number; unconfirmed: number; noHandle: number };
  active: RawDashboard["active"] & { stickiness: number | null };
  funnel: FunnelStep[];
  requests: RawDashboard["requests"];
  averageOrderUsd: number | null;
  pipeline: RawDashboard["pipeline"];
  topArtists: RawDashboard["top_artists"];
  listings: RawDashboard["listings"];
  shelves: RawDashboard["shelves"];
  shop: ShopRow[];
  topItems: { kind: ItemKind; id: string; name: string; aisle: string; taken: number; bought: number }[];
  team: RawDashboard["team"];
  generatedAt: string;
};

export function buildDashboard(raw: RawDashboard, window: Window, feePercent: number): Dashboard {
  const days = daysOf(raw, feePercent);
  const bucketDays = bucketDaysOf(window.days);
  const current = bucketize(days, window.from, window.to, bucketDays);
  const before = addDays(window.from, -1);
  const previous = window.compare ? bucketize(days, window.seriesFrom, before, bucketDays) : [];
  const totals = total(days.filter((d) => d.day >= window.from && d.day <= window.to));
  const previousTotals = window.compare ? total(days.filter((d) => d.day >= window.seriesFrom && d.day <= before)) : null;

  const r = raw.requests;
  const steps: [string, string, number][] = [
    ["sent", "Requested", r.sent],
    ["quoted", "Quoted", r.quoted],
    ["paid", "Paid", r.paid],
    ["started", "Started", r.started],
    ["delivered", "Delivered", r.delivered],
  ];

  const shop = KIND_ORDER.map((kind): ShopRow => {
    const rows = raw.shop.filter((row) => row.kind === kind);
    const count = (source: string) => rows.filter((row) => row.source === source).reduce((sum, row) => sum + row.n, 0);
    const worth = (source: string) =>
      rows.filter((row) => row.source === source).reduce((sum, row) => sum + row.n * priceOf(kind, row.item), 0);
    return {
      kind,
      label: KINDS[kind].aisle,
      claimed: count("claim"),
      bought: count("purchase"),
      picks: count("monthly"),
      gifts: count("gift"),
      revenueUsd: worth("purchase"),
      picksWorthUsd: worth("monthly"),
    };
  });

  const byItem = new Map<string, Dashboard["topItems"][number]>();
  for (const row of raw.shop) {
    const key = `${row.kind}:${row.item}`;
    const entry = byItem.get(key) ?? {
      kind: row.kind,
      id: row.item,
      name: itemOf(row.kind, row.item)?.name ?? row.item,
      aisle: KINDS[row.kind]?.aisle ?? row.kind,
      taken: 0,
      bought: 0,
    };
    entry.taken += row.n;
    if (row.source === "purchase") entry.bought += row.n;
    byItem.set(key, entry);
  }

  return {
    window,
    bucketDays,
    feePercent,
    current,
    previous,
    totals,
    previousTotals,
    receipt: [
      { id: "commissions", label: "Commission fees", basisUsd: totals.commissionsUsd, usd: totals.feeCommissionsUsd, count: totals.paidOrders },
      { id: "adoptables", label: "Adoptable fees", basisUsd: totals.adoptionsUsd, usd: totals.feeAdoptionsUsd, count: totals.adoptions },
      { id: "shop", label: "Shop sales", basisUsd: null, usd: totals.shopUsd, count: totals.shopSales },
      { id: "plans", label: "Flow+ plans", basisUsd: null, usd: totals.plansUsd, count: raw.accounts.subscribers },
    ],
    accounts: {
      ...raw.accounts,
      collectors: raw.accounts.total - raw.accounts.artists,
      unconfirmed: raw.unfinished.unconfirmed,
      noHandle: raw.unfinished.no_handle,
    },
    active: { ...raw.active, stickiness: raw.active.month > 0 ? totals.active / raw.active.month : null },
    funnel: steps.map(([id, label, n]) => ({ id, label, n, share: r.sent > 0 ? n / r.sent : 0 })),
    requests: r,
    averageOrderUsd: totals.paidOrders > 0 ? totals.commissionsUsd / totals.paidOrders : null,
    pipeline: raw.pipeline,
    topArtists: raw.top_artists,
    listings: raw.listings,
    shelves: raw.shelves,
    shop,
    topItems: [...byItem.values()].sort((a, b) => b.taken - a.taken || b.bought - a.bought).slice(0, 6),
    team: raw.team,
    generatedAt: raw.generated_at,
  };
}

/** How many days a window's last bucket covers, for labels like "this week (3 days)". */
export const bucketLength = (bucket: Bucket) => daysBetween(bucket.start, bucket.end) + 1;
