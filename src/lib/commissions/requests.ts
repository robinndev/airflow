import type { ImageAsset } from "@/lib/profile/types";
import { daysUntil, type Step } from "./queue.ts";

/*
 * The buyer's side (/requests): every commission you asked another artist
 * for, followed like a parcel from the request to the delivered file. Pure
 * and client-safe. Real proposals, payments and deliveries arrive with the
 * commission flow (docs/roadmap.md); until then most of these are a sample.
 */

export type RequestStatus =
  /** Sent, the artist hasn't answered yet. */
  | "sent"
  | "waitlisted"
  /** The artist sent a quote: the buyer's move. */
  | "quoted"
  /** Paid; `step` says how far the piece is (none yet = waiting its turn). */
  | "paid"
  | "delivered"
  | "declined"
  | "expired"
  | "cancelled";

export type MyRequest = {
  id: string;
  artist: { handle: string; name: string; avatar: ImageAsset };
  service: string;
  /** The service's example art: it goes on the postage stamp. */
  cover?: ImageAsset;
  character?: { name: string; palette: string[] };
  /** Your request, in your words. */
  brief: string;
  status: RequestStatus;
  step?: Step;
  /** The "from" price plus ticked extras until there's a quote; the quote once there is one. */
  priceUsd: number;
  extras?: { label: string; priceUsd: number }[];
  sentAt: string;
  quotedAt?: string;
  quoteExpiresAt?: string;
  paidAt?: string;
  dueAt?: string;
  deliveredAt?: string;
  closedAt?: string;
  /** The artist's word when declining. */
  artistNote?: string;
  /** The latest progress shot the artist shared. */
  progress?: ImageAsset;
  /** The finished piece. */
  delivery?: ImageAsset;
  /** Made from a request you really sent on Artiflow (not the sample). */
  real?: boolean;
  /** Still waiting on the artist, so the buyer can take it back. */
  cancellable?: boolean;
};

/** The stops on the route, each stamped with its date once it's reached. */
export const STOPS = ["sent", "quoted", "paid", "making", "delivered"] as const;
export type Stop = (typeof STOPS)[number];

export const STOP_LABEL: Record<Stop, string> = {
  sent: "Sent",
  quoted: "Quote",
  paid: "Paid",
  making: "In the works",
  delivered: "Delivered",
};

/** How far along the route it got (closed requests stop where they ended). */
export function stopOf(request: MyRequest): Stop {
  switch (request.status) {
    case "sent":
    case "waitlisted":
    case "declined":
      return "sent";
    case "quoted":
    case "expired":
      return "quoted";
    case "cancelled":
      return request.paidAt ? "paid" : request.quotedAt ? "quoted" : "sent";
    case "paid":
      return request.step ? "making" : "paid";
    case "delivered":
      return "delivered";
  }
}

/** When each reached stop was stamped. */
export function stampOf(request: MyRequest, stop: Stop): string | undefined {
  if (STOPS.indexOf(stop) > STOPS.indexOf(stopOf(request))) return undefined;
  switch (stop) {
    case "sent":
      return request.sentAt;
    case "quoted":
      return request.quotedAt;
    case "paid":
      return request.paidAt;
    case "making":
      return request.paidAt && request.step ? request.paidAt : undefined;
    case "delivered":
      return request.deliveredAt;
  }
}

export const isClosed = (request: MyRequest) =>
  request.status === "declined" || request.status === "expired" || request.status === "cancelled";

export type Show = "all" | "yours" | "waiting" | "making" | "delivered" | "closed";

export const SHOWS: { id: Show; label: string }[] = [
  { id: "all", label: "All" },
  { id: "yours", label: "Your move" },
  { id: "waiting", label: "Waiting on the artist" },
  { id: "making", label: "In the works" },
  { id: "delivered", label: "Delivered" },
  { id: "closed", label: "Closed" },
];

export const isShow = (value: unknown): value is Show => SHOWS.some((show) => show.id === value);

export function inShow(request: MyRequest, show: Show): boolean {
  switch (show) {
    case "all":
      return true;
    case "yours":
      return request.status === "quoted";
    case "waiting":
      return request.status === "sent" || request.status === "waitlisted";
    case "making":
      return request.status === "paid";
    case "delivered":
      return request.status === "delivered";
    case "closed":
      return isClosed(request);
  }
}

export function countShows(requests: MyRequest[]): Record<Show, number> {
  return Object.fromEntries(SHOWS.map(({ id }) => [id, requests.filter((r) => inShow(r, id)).length])) as Record<Show, number>;
}

/**
 * Your move first (quotes run out), then work in progress by due date, then
 * what's waiting on artists, the newest deliveries, and what's closed.
 */
export function sortRequests(requests: MyRequest[]): MyRequest[] {
  const rank = (r: MyRequest) =>
    r.status === "quoted" ? 0 : r.status === "paid" ? 1 : r.status === "sent" || r.status === "waitlisted" ? 2 : r.status === "delivered" ? 3 : 4;
  const when = (r: MyRequest) =>
    r.status === "quoted"
      ? (r.quoteExpiresAt ?? "")
      : r.status === "paid"
        ? (r.dueAt ?? "")
        : r.status === "delivered"
          ? `~${r.deliveredAt}` // newest first, flipped below
          : (r.sentAt ?? "");
  return requests.toSorted((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.status === "delivered" || rank(a) === 2 || rank(a) === 4) return when(b).localeCompare(when(a));
    return when(a).localeCompare(when(b));
  });
}

/** The shipping label's numbers: what's coming next, and what needs you. */
export function shipment(requests: MyRequest[], today: string) {
  const making = requests.filter((r) => r.status === "paid");
  const next = making.filter((r) => r.dueAt).toSorted((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0];
  const year = today.slice(0, 4);
  return {
    next,
    nextInDays: next?.dueAt ? daysUntil(next.dueAt, today) : undefined,
    making: making.length,
    quotes: requests.filter((r) => r.status === "quoted").length,
    waiting: requests.filter((r) => r.status === "sent" || r.status === "waitlisted").length,
    spentThisYearUsd: requests
      .filter((r) => (r.status === "paid" || r.status === "delivered") && r.paidAt?.startsWith(year))
      .reduce((sum, r) => sum + r.priceUsd, 0),
  };
}
