import type { CommissionStatus } from "@/lib/profile/types";
import { categoryLabel, type ServiceCategory } from "./catalog.ts";

/*
 * Status and slots of commission services. Each service is Open, Waitlist or
 * Closed on its own; a profile's status is its most open service, so the two
 * can't drift. A slot is taken when a request arrives and comes back when the
 * artist declines it or the buyer cancels (the database does the counting,
 * see the listings migration). Pure and client-safe.
 */

export type Slots = { total: number; taken: number } | null;

const RANK: Record<CommissionStatus, number> = { open: 0, waitlist: 1, closed: 2 };

/** Open beats Waitlist beats Closed; no services at all is Closed. */
export function mostOpen(statuses: readonly CommissionStatus[]): CommissionStatus {
  return statuses.reduce<CommissionStatus>((best, s) => (RANK[s] < RANK[best] ? s : best), "closed");
}

/** Null when the artist didn't cap the service. */
export const slotsLeft = (slots: Slots | undefined) => (slots ? Math.max(0, slots.total - slots.taken) : null);

export const STATUS_INFO: Record<CommissionStatus, { label: string; verb: string; hint: string }> = {
  open: { label: "Open", verb: "Request", hint: "Taking requests now" },
  waitlist: { label: "Waitlist", verb: "Join waitlist", hint: "Taking requests, no start date yet" },
  closed: { label: "Closed", verb: "Closed", hint: "Not taking requests" },
};

type Priced = {
  status?: CommissionStatus;
  slots?: Slots;
  priceFromUsd: number;
  turnaroundDays: { min: number; max: number };
  turnaround: string;
  category: ServiceCategory;
};

/**
 * The profile-level commission card for an artist whose services are real:
 * most open status, slots summed over the services that take requests, the
 * cheapest price and the quickest turnaround among them.
 */
export function summarizeServices(services: readonly Priced[]) {
  const status = mostOpen(services.map((s) => s.status ?? "closed"));
  const taking = services.filter((s) => (s.status ?? "closed") !== "closed");
  const pool = taking.length ? taking : services;
  const capped = taking.filter((s) => s.slots);
  const quickest = pool.toSorted((a, b) => a.turnaroundDays.max - b.turnaroundDays.max)[0];
  return {
    status,
    slotsTotal: capped.reduce((sum, s) => sum + s.slots!.total, 0),
    slotsTaken: capped.reduce((sum, s) => sum + Math.min(s.slots!.taken, s.slots!.total), 0),
    startingPriceUsd: pool.length ? Math.min(...pool.map((s) => s.priceFromUsd)) : 0,
    turnaround: quickest?.turnaround ?? "",
    types: [...new Set(services.map((s) => categoryLabel(s.category)))],
  };
}
