import type { ImageAsset } from "@/lib/profile/types";
import type { CancelReason } from "./cancel.ts";

/*
 * The artist's commission queue (/commissions): every order from the first
 * request to the final file. Pure and client-safe, so the board, the ledger
 * and the planner all read the same rules. Real orders arrive with the
 * commission flow (docs/roadmap.md); until then the queue is a sample.
 */

/** Columns on the wall, in the order a piece moves through them. */
export type Lane = "request" | "proposal" | "queued" | "wip" | "delivered";

/** Where a piece on the easel stands, rough sketch → rendered. */
export type Step = "sketch" | "lineart" | "flats" | "render";

export type Payment = "unpaid" | "invoiced" | "paid";

export type QueueOrder = {
  id: string;
  /** Printed on the ticket ("No. 0042"). */
  number: number;
  client: { handle: string; name: string; avatar: ImageAsset };
  /** The OC being drawn, with the colors the artist works from. */
  character?: { name: string; palette: string[] };
  service: string;
  /** Everything included: the service's price plus `extras`. */
  priceUsd: number;
  /** Licenses and add-ons the buyer ticked on top ("Full shading", +$10). */
  extras?: { label: string; priceUsd: number }[];
  lane: Lane;
  /** On the easel only. */
  step?: Step;
  payment: Payment;
  usage: "personal" | "commercial";
  /** The buyer asked not to have it posted. */
  private?: boolean;
  /** A request parked on the waitlist: unpaid, no start date yet. */
  waitlist?: boolean;
  paused?: boolean;
  pausedReason?: string;
  archived?: boolean;
  /** Archived because the artist said no. */
  declined?: boolean;
  /** The buyer's request, in their words. */
  brief: string;
  references: ImageAsset[];
  requestedAt: string;
  proposalExpiresAt?: string;
  paidAt?: string;
  dueAt?: string;
  deliveredAt?: string;
  /** Private to the artist. */
  note?: string;
  /** Links the buyer pasted (real requests take links, not uploads yet). */
  referenceLinks?: string;
  /** A request really sent on Artiflow: it moves only when the order is processed (no dragging). */
  real?: boolean;
  /** Real orders: where the order stands on the server (src/lib/commissions/real.ts). */
  orderStatus?: OrderStatus;
  /** The artist's note on the quote they sent. */
  quoteNote?: string;
  /** Why the buyer cancelled (a real order), and what they added. */
  cancelReason?: CancelReason;
  cancelNote?: string;
  /** What the artist delivered. */
  delivery?: { images: ImageAsset[]; note?: string };
};

/** A real order's state (`commission_requests.status`). */
export type OrderStatus =
  | "pending"
  | "waitlisted"
  | "quoted"
  | "paid"
  | "in_progress"
  | "delivered"
  | "declined"
  | "cancelled"
  | "expired";

export const LANES: Lane[] = ["request", "proposal", "queued", "wip", "delivered"];

export const LANE_INFO: Record<Lane, { label: string; hint: string }> = {
  request: { label: "New requests", hint: "say yes, no or later" },
  proposal: { label: "Awaiting payment", hint: "their move" },
  queued: { label: "Up next", hint: "paid & waiting their turn" },
  wip: { label: "On the easel", hint: "sketch → render" },
  delivered: { label: "Delivered", hint: "sent with love" },
};

export const STEPS: Step[] = ["sketch", "lineart", "flats", "render"];

export const STEP_LABEL: Record<Step, string> = {
  sketch: "Sketch",
  lineart: "Lineart",
  flats: "Flats",
  render: "Render",
};

export type Tab = "attention" | "waitlist" | "client" | "paused" | "delivered" | "all" | "archived";

export const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs you" },
  { id: "client", label: "Client's turn" },
  { id: "waitlist", label: "Waitlist" },
  { id: "paused", label: "Paused" },
  { id: "delivered", label: "Delivered" },
  { id: "archived", label: "Archived" },
];

export const isTab = (value: unknown): value is Tab => TABS.some((tab) => tab.id === value);

/** The artist has something to do: a request to answer, or a paid piece to draw. */
export function needsArtist(order: QueueOrder) {
  if (order.archived || order.paused) return false;
  if (order.lane === "request") return !order.waitlist;
  return order.lane === "queued" || order.lane === "wip";
}

export function inTab(order: QueueOrder, tab: Tab): boolean {
  if (tab === "archived") return !!order.archived;
  if (order.archived) return false;
  switch (tab) {
    case "attention":
      return needsArtist(order);
    case "waitlist":
      return order.lane === "request" && !!order.waitlist;
    case "client":
      return order.lane === "proposal" && !order.paused;
    case "paused":
      return !!order.paused;
    case "delivered":
      return order.lane === "delivered";
    case "all":
      return true;
  }
}

export function countTabs(orders: QueueOrder[]): Record<Tab, number> {
  const counts = Object.fromEntries(TABS.map((tab) => [tab.id, 0])) as Record<Tab, number>;
  for (const order of orders) for (const tab of TABS) if (inTab(order, tab.id)) counts[tab.id]++;
  return counts;
}

/** Search by client, character, service or ticket number. */
export function matches(order: QueueOrder, query: string) {
  const q = query.trim().toLowerCase().replace(/^[@#]|^no\.?\s*/, "");
  if (!q) return true;
  return [order.client.name, order.client.handle, order.character?.name ?? "", order.service, ticketNumber(order)]
    .some((field) => field.toLowerCase().includes(q));
}

export const ticketNumber = (order: Pick<QueueOrder, "number">) => String(order.number).padStart(4, "0");

/* ---- Moving things along ---- */

export type OrderPatch = Partial<
  Pick<QueueOrder, "lane" | "step" | "payment" | "waitlist" | "paused" | "archived" | "declined" | "deliveredAt" | "note">
>;

/**
 * What changes when a ticket lands in another column. Nothing here marks an
 * order paid: only the buyer paying does (stubbed until the provider lands).
 * Moving into "Awaiting payment" sends the proposal, so it's invoiced; moving
 * an unpaid order back out withdraws it.
 */
export function moveTo(order: QueueOrder, lane: Lane, now: Date): OrderPatch {
  if (lane === order.lane) return {};
  const patch: OrderPatch = { lane, waitlist: false };
  if (order.payment !== "paid") patch.payment = lane === "proposal" ? "invoiced" : "unpaid";
  if (lane === "wip") patch.step = order.step ?? "sketch";
  if (lane === "delivered") {
    patch.deliveredAt = now.toISOString();
    patch.step = "render";
  } else {
    patch.deliveredAt = undefined;
  }
  if (lane === "request" || lane === "proposal") patch.step = undefined;
  return patch;
}

/** The one thing to do next, as the ledger's action button and the drawer's primary action. */
export type NextAction =
  | { kind: "review"; label: string }
  | { kind: "start"; label: string }
  | { kind: "step"; label: string; step: Step }
  | { kind: "deliver"; label: string }
  | { kind: "resume"; label: string }
  | null;

export function nextAction(order: QueueOrder): NextAction {
  if (order.archived) return null;
  if (order.paused) return { kind: "resume", label: "Resume" };
  switch (order.lane) {
    case "request":
      return { kind: "review", label: order.waitlist ? "Review again" : "Review request" };
    case "queued":
      return { kind: "start", label: "Start sketching" };
    case "wip": {
      const at = STEPS.indexOf(order.step ?? "sketch");
      const next = STEPS[at + 1];
      return next ? { kind: "step", label: `On to ${STEP_LABEL[next].toLowerCase()}`, step: next } : { kind: "deliver", label: "Deliver" };
    }
    default:
      return null;
  }
}

export function applyPatches(orders: QueueOrder[], patches: Record<string, OrderPatch>): QueueOrder[] {
  return orders.map((order) => {
    const patch = patches[order.id];
    if (!patch) return order;
    const merged = { ...order, ...patch };
    // A patch clears a field with undefined (null once it has been stored); drop the key.
    for (const key of Object.keys(patch) as (keyof OrderPatch)[]) if (patch[key] == null) delete merged[key];
    return merged;
  });
}

/* ---- Dates ---- */

const DAY = 86_400_000;

/** Whole days from `today` (YYYY-MM-DD, the artist's calendar day) to an ISO date. */
export function daysUntil(iso: string, today: string) {
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(today)) / DAY);
}

export type DueTone = "late" | "soon" | "ok" | "done" | "none";

export function dueState(order: QueueOrder, today: string): { tone: DueTone; label: string; days?: number } {
  if (order.lane === "delivered" && order.deliveredAt) {
    return { tone: "done", label: `Delivered ${relativeDay(daysUntil(order.deliveredAt, today))}` };
  }
  if (order.lane === "proposal" && order.proposalExpiresAt) {
    const days = daysUntil(order.proposalExpiresAt, today);
    return { tone: days <= 1 ? "soon" : "ok", label: days < 0 ? "Proposal expired" : `Expires ${relativeDay(days)}`, days };
  }
  if (!order.dueAt) return { tone: "none", label: order.lane === "request" ? `Asked ${relativeDay(daysUntil(order.requestedAt, today))}` : "No date yet" };
  const days = daysUntil(order.dueAt, today);
  if (days < 0) return { tone: "late", label: `${-days} ${-days === 1 ? "day" : "days"} late`, days };
  return { tone: days <= 3 ? "soon" : "ok", label: days === 0 ? "Due today" : `Due ${relativeDay(days)}`, days };
}

/** "today", "tomorrow", "in 5 days", "yesterday", "3 days ago". */
export function relativeDay(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** `count` calendar days starting at `today`, as YYYY-MM-DD. */
export function daysAhead(today: string, count = 7): string[] {
  const start = Date.parse(today);
  return Array.from({ length: count }, (_, i) => new Date(start + i * DAY).toISOString().slice(0, 10));
}

/* ---- Sorting & totals ---- */

export type SortKey = "due" | "requested" | "price";

/**
 * Soonest first for dates (undated last), highest first for price; `dir` flips
 * it. By due date, finished work (delivered) always comes after open work.
 */
export function sortOrders(orders: QueueOrder[], key: SortKey, dir: "asc" | "desc" = "asc") {
  const sign = dir === "asc" ? 1 : -1;
  const dateOf = (order: QueueOrder) =>
    key === "requested" ? order.requestedAt : (order.deliveredAt ?? order.dueAt ?? order.proposalExpiresAt);
  const done = (order: QueueOrder) => (key === "due" && order.lane === "delivered" ? 1 : 0);
  return orders.toSorted((a, b) => {
    if (done(a) !== done(b)) return done(a) - done(b);
    if (key === "price") return sign * (b.priceUsd - a.priceUsd) || a.number - b.number;
    const da = dateOf(a);
    const db = dateOf(b);
    if (!da || !db) return da ? -1 : db ? 1 : b.number - a.number;
    return sign * da.localeCompare(db) || b.number - a.number;
  });
}

/**
 * How a column stacks: newest requests on top, then whatever is due or
 * expires first, newest deliveries on top. Paused tickets sink to the bottom.
 */
export function laneOrder(orders: QueueOrder[], lane: Lane): QueueOrder[] {
  const inLane = orders.filter((order) => order.lane === lane);
  const sorted =
    lane === "request"
      ? sortOrders(inLane, "requested", "desc")
      : lane === "delivered"
        ? sortOrders(inLane, "due", "desc")
        : sortOrders(inLane, "due");
  return [...sorted.filter((order) => !order.paused), ...sorted.filter((order) => order.paused)];
}

/** Money the buyer paid that hasn't been delivered yet, the month's deliveries, and what needs doing. */
export function tally(orders: QueueOrder[], today: string, feePercent: number) {
  const live = orders.filter((order) => !order.archived);
  const month = today.slice(0, 7);
  const delivered = live.filter((order) => order.lane === "delivered" && order.deliveredAt?.slice(0, 7) === month);
  const inProgress = live.filter((order) => order.payment === "paid" && order.lane !== "delivered");
  const deliveredUsd = delivered.reduce((sum, order) => sum + order.priceUsd, 0);
  return {
    needsYou: live.filter(needsArtist).length,
    onEasel: live.filter((order) => order.lane === "wip" && !order.paused).length,
    inProgressUsd: inProgress.reduce((sum, order) => sum + order.priceUsd, 0),
    deliveredThisMonth: delivered.length,
    earnedThisMonthUsd: deliveredUsd * (1 - feePercent / 100),
    late: live.filter((order) => dueState(order, today).tone === "late").length,
  };
}
