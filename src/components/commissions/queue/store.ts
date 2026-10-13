"use client";

import { useEffect, useSyncExternalStore } from "react";
import { applyPatches, type OrderPatch, type QueueOrder } from "@/lib/commissions/queue";

/*
 * The queue on this device. Real orders come from the server, and every change
 * to them goes through a Server Action: patches only show it right away and
 * are dropped when the server's new copy arrives (`version`). The sample
 * (artists with no real orders yet) keeps the artist's changes as patches in
 * localStorage, per account. The planner and the workspace are separate
 * islands sharing this store.
 */

type Change = { id: string; before: OrderPatch | undefined; label: string; at: number };

type State = {
  handle: string;
  /** Which server copy this is (handle + day); the islands each get their own copy of the same data. */
  key: string;
  base: QueueOrder[];
  patches: Record<string, OrderPatch>;
  orders: QueueOrder[];
  last: Change | null;
  /** Real orders: nothing is saved on the device. */
  live: boolean;
};

const VERSION = 1;
const storageKey = (handle: string) => `artiflow:queue:${handle}`;

let state: State | null = null;
const listeners = new Set<() => void>();
const loaded = new Set<string>();

function emit(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function save(next: State) {
  if (next.live) return;
  try {
    // Cleared fields are undefined in memory; store them as null so they stay cleared.
    const json = JSON.stringify({ v: VERSION, patches: next.patches }, (_, value) => (value === undefined ? null : value));
    localStorage.setItem(storageKey(next.handle), json);
  } catch {
    // Private mode or full storage: changes still apply until the page closes.
  }
}

function seed(handle: string, today: string, base: QueueOrder[], version: string, live: boolean) {
  const key = `${handle}|${today}|${version}`;
  if (state?.key === key) return;
  // The sample keeps the artist's changes; real orders take the server's copy as it is.
  const patches = state?.handle === handle && !live && !state.live ? state.patches : {};
  state = { handle, key, base, patches, orders: applyPatches(base, patches), last: null, live };
}

/** The viewer's orders with their changes applied. Every island passes the same server data. */
export function useQueue({
  handle,
  today,
  orders: base,
  version,
  sample,
}: {
  handle: string;
  today: string;
  orders: QueueOrder[];
  version: string;
  sample: boolean;
}) {
  seed(handle, today, base, version, !sample);

  useEffect(() => {
    if (!sample) return;
    if (loaded.has(handle)) return;
    loaded.add(handle);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(handle)) ?? "null");
      if (saved?.v === VERSION && saved.patches && state?.handle === handle) {
        emit({ ...state, patches: saved.patches, orders: applyPatches(state.base, saved.patches) });
      }
    } catch {
      // Unreadable: start from the server's copy.
    }
  }, [handle, sample]);

  const orders = useSyncExternalStore(
    subscribe,
    () => (state?.handle === handle ? state.orders : base),
    () => base,
  );
  const last = useSyncExternalStore(
    subscribe,
    () => (state?.handle === handle ? state.last : null),
    () => null,
  );
  return { orders, last };
}

/** Applies a change to one order. With a `label`, it becomes the change Undo reverts; without, it's silent (notes). */
export function updateOrder(id: string, patch: OrderPatch, label?: string) {
  if (!state || Object.keys(patch).length === 0) return;
  const before = state.patches[id];
  const patches = { ...state.patches, [id]: { ...before, ...patch } };
  const last = label ? { id, before, label, at: Date.now() } : state.last;
  const next = { ...state, patches, orders: applyPatches(state.base, patches), last };
  emit(next);
  save(next);
}

export function undoLast() {
  if (!state?.last) return;
  const { id, before } = state.last;
  const patches = { ...state.patches };
  if (before) patches[id] = before;
  else delete patches[id];
  const next = { ...state, patches, orders: applyPatches(state.base, patches), last: null };
  emit(next);
  save(next);
}

/** Back to the queue as the server sent it. */
export function resetQueue() {
  if (!state) return;
  const next = { ...state, patches: {}, orders: state.base, last: null };
  emit(next);
  try {
    localStorage.removeItem(storageKey(state.handle));
  } catch {}
}
