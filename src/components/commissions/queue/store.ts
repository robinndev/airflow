"use client";

import { useSyncExternalStore } from "react";
import { applyPatches, type OrderPatch, type QueueOrder } from "@/lib/commissions/queue";

/*
 * The artist's queue on this page. Orders come from the server, and every
 * change goes through a Server Action (request-actions.ts): a patch only shows
 * it right away, and is dropped when the server's new copy arrives (a new
 * `version`). The planner and the workspace are separate islands sharing
 * this store.
 */

type State = {
  handle: string;
  /** Which server copy this is (handle + day + version); the islands each get their own copy of the same data. */
  key: string;
  base: QueueOrder[];
  patches: Record<string, OrderPatch>;
  orders: QueueOrder[];
};

let state: State | null = null;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The server's copy wins: a new version drops whatever was shown ahead of it. */
function seed(handle: string, today: string, base: QueueOrder[], version: string) {
  const key = `${handle}|${today}|${version}`;
  if (state?.key === key) return;
  state = { handle, key, base, patches: {}, orders: base };
}

/** The viewer's orders, with any change still on its way to the server. Every island passes the same server data. */
export function useQueue({ handle, today, orders: base, version }: { handle: string; today: string; orders: QueueOrder[]; version: string }) {
  seed(handle, today, base, version);
  const orders = useSyncExternalStore(
    subscribe,
    () => (state?.handle === handle ? state.orders : base),
    () => base,
  );
  return { orders };
}

/** Shows a change right away, ahead of the server confirming it. */
export function updateOrder(id: string, patch: OrderPatch) {
  if (!state || Object.keys(patch).length === 0) return;
  const patches = { ...state.patches, [id]: { ...state.patches[id], ...patch } };
  emit({ ...state, patches, orders: applyPatches(state.base, patches) });
}
