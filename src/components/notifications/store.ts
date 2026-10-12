"use client";

import { useSyncExternalStore } from "react";
import { loadNotifications, markNotificationsRead } from "@/app/(site)/notification-actions";
import { onNotificationSignal, type NotificationSignal } from "@/components/messages/store";
import type { AppNotification } from "@/lib/notifications/types";

/*
 * Notifications in the browser. No channel of their own: the badge rides the
 * messages pulse (`message_pulse()` also counts unread notices) and, while
 * the chat socket is open, live notices on the same inbox channel (see
 * onNotificationSignal in messages/store.ts). The list itself loads lazily:
 * on the way to the bell (hover, focus) or when it opens, and again only
 * when a pulse says something new arrived.
 *
 * Opening the bell marks everything read, but what was new when it opened
 * stays marked "New" until it closes, so you can still see what changed.
 */

type State = {
  /** Undefined until the header has streamed in; null for visitors. */
  viewer: string | null | undefined;
  /** The bell's list (newest 24), null until loaded. */
  items: AppNotification[] | null;
  failed: boolean;
  unread: number;
  /** Counts arrivals, so the bell rings on each. */
  rings: number;
};

let state: State = { viewer: undefined, items: null, failed: false, unread: 0, rings: 0 };
const listeners = new Set<() => void>();
/** Newest activity this tab knows of (pulse baseline). */
let latestSeen: string | null | undefined;
let stale = false;
let loading: Promise<void> | null = null;
let open = false;
/** When this tab last marked everything read: a pulse taken just before still counts the old unread. */
let markedAt = 0;
let liveTimer: ReturnType<typeof setTimeout> | undefined;
let tabs: BroadcastChannel | null = null;

function update(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const later = (a: string | null | undefined, b: string | null) => (!a || (b && b > a) ? b : a);

function onSignal(signal: NotificationSignal) {
  if (!state.viewer) return;
  if (signal.type === "live") {
    latestSeen = later(latestSeen, signal.at);
    stale = true;
    update({ rings: state.rings + 1 });
    // A burst (several likes at once) becomes one reload.
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => void load(), 1200);
    return;
  }
  const since = latestSeen;
  latestSeen = later(since, signal.latest);
  const news = since !== undefined && signal.latest !== null && (!since || signal.latest > since);
  if (news) {
    stale = true;
    update({ unread: signal.unread, rings: state.rings + 1 });
    if (open) void load();
  } else if (Date.now() - markedAt > 5000 && signal.unread !== state.unread) {
    // Read on another device (or the first pulse: just the badge).
    update({ unread: signal.unread });
  }
}

if (typeof window !== "undefined") onNotificationSignal(onSignal);

function listenToTabs() {
  if (tabs || typeof BroadcastChannel === "undefined") return;
  tabs = new BroadcastChannel("artiflow-notifications");
  tabs.onmessage = (event: MessageEvent<{ type?: string; viewer?: string }>) => {
    if (event.data?.type !== "read" || event.data.viewer !== state.viewer) return;
    markedAt = Date.now();
    update({ unread: 0, items: state.items?.map((n) => ({ ...n, unread: false })) ?? null });
  };
}

async function load() {
  if (loading) return loading;
  const viewer = state.viewer;
  if (!viewer) return;
  loading = (async () => {
    try {
      const page = await loadNotifications();
      if (state.viewer !== viewer || !page) return;
      stale = false;
      latestSeen = later(latestSeen, page.items[0]?.at ?? null);
      // While the bell is open, what was already shown as new stays new.
      const shownNew = new Set(state.items?.filter((n) => n.unread).map((n) => n.id));
      const items = open ? page.items.map((n) => (shownNew.has(n.id) ? { ...n, unread: true } : n)) : page.items;
      update({ items, failed: false, unread: Date.now() - markedAt > 5000 ? page.unread : state.unread });
      if (open && page.unread > 0) void markAllRead();
    } catch {
      if (state.viewer === viewer) update({ failed: true });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** On the way to the bell: load the list if it isn't there yet (or something arrived since). */
export function ensureNotifications() {
  if (state.viewer && (!state.items || stale || state.failed)) void load();
}

/** Everything read, here and in this browser's other tabs; the list keeps its "New" marks until the bell closes. */
export async function markAllRead() {
  if (!state.viewer) return;
  markedAt = Date.now();
  update({ unread: 0 });
  tabs?.postMessage({ type: "read", viewer: state.viewer });
  await markNotificationsRead().catch(() => undefined);
  markedAt = Date.now();
}

/** The bell opened or closed. */
export function setBellOpen(next: boolean) {
  if (open === next) return;
  open = next;
  if (next) {
    if (!state.items || stale || state.failed) void load();
    else if (state.unread > 0) void markAllRead();
  } else if (state.items?.some((n) => n.unread)) {
    update({ items: state.items.map((n) => ({ ...n, unread: false })) });
  }
}

/** Called by the header with the signed-in viewer: a new viewer starts from their own book. */
export function syncNotificationsViewer(viewer: string | null) {
  if (viewer === state.viewer) return;
  latestSeen = undefined;
  stale = false;
  clearTimeout(liveTimer);
  update({ viewer, items: null, failed: false, unread: 0 });
  if (viewer) listenToTabs();
}

/** The page opened the whole book: the bell's list is stale and nothing is unread any more. */
export function noteBookOpened() {
  stale = true;
  void markAllRead();
}

export function useNotifications() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
