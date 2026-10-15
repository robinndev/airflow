"use client";

import { useSyncExternalStore } from "react";
import { loadNotifications, loadOrderNotices, markNotificationsRead } from "@/app/(site)/notification-actions";
import { onNotificationSignal, type NotificationSignal } from "@/components/messages/store";
import type { AppNotification, NoticeScope, NotificationPage } from "@/lib/notifications/types";

/*
 * Notifications in the browser, in two stores of the same shape: the guest
 * book (the bell: likes, comments, follows, reposts…) and the order
 * clipboard (commission notices, apart so they never get lost in the
 * applause). No channel of their own: the badges ride the messages pulse
 * (`message_pulse()` counts each scope's unread notices) and, while the chat
 * socket is open, live notices on the same inbox channel (see
 * onNotificationSignal in messages/store.ts). Each list loads lazily: on the
 * way to its button (hover, focus) or when it opens, and again only when a
 * pulse says something new arrived.
 *
 * Opening a list marks its scope read, but what was new when it opened stays
 * marked "New" until it closes, so you can still see what changed.
 */

type State = {
  /** Undefined until the header has streamed in; null for visitors. */
  viewer: string | null | undefined;
  /** The list (newest 24), null until loaded. */
  items: AppNotification[] | null;
  failed: boolean;
  unread: number;
  /** Counts arrivals, so the button rings on each. */
  rings: number;
};

function createNoticeStore(scope: NoticeScope, fetchPage: () => Promise<(NotificationPage & { unread: number }) | null>) {
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
    if (!state.viewer || signal.scope !== scope) return;
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

  function listenToTabs() {
    if (tabs || typeof BroadcastChannel === "undefined") return;
    tabs = new BroadcastChannel(`artiflow-notifications-${scope}`);
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
        const page = await fetchPage();
        if (state.viewer !== viewer || !page) return;
        stale = false;
        latestSeen = later(latestSeen, page.items[0]?.at ?? null);
        // While the list is open, what was already shown as new stays new.
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

  /** Everything in this scope read, here and in this browser's other tabs; the list keeps its "New" marks until it closes. */
  async function markAllRead() {
    if (!state.viewer) return;
    markedAt = Date.now();
    update({ unread: 0 });
    tabs?.postMessage({ type: "read", viewer: state.viewer });
    await markNotificationsRead(scope).catch(() => undefined);
    markedAt = Date.now();
  }

  return {
    onSignal,
    /** On the way to the button: load the list if it isn't there yet (or something arrived since). */
    ensure() {
      if (state.viewer && (!state.items || stale || state.failed)) void load();
    },
    markAllRead,
    /** The list opened or closed. */
    setOpen(next: boolean) {
      if (open === next) return;
      open = next;
      if (next) {
        if (!state.items || stale || state.failed) void load();
        else if (state.unread > 0) void markAllRead();
      } else if (state.items?.some((n) => n.unread)) {
        update({ items: state.items.map((n) => ({ ...n, unread: false })) });
      }
    },
    /** Called by the header with the signed-in viewer: a new viewer starts from their own notices. */
    syncViewer(viewer: string | null) {
      if (viewer === state.viewer) return;
      latestSeen = undefined;
      stale = false;
      clearTimeout(liveTimer);
      update({ viewer, items: null, failed: false, unread: 0 });
      if (viewer) listenToTabs();
    },
    /** A page showed the whole scope: the dropdown's list is stale and nothing is unread any more. */
    opened() {
      stale = true;
      void markAllRead();
    },
    useStore() {
      return useSyncExternalStore(
        subscribe,
        () => state,
        () => state,
      );
    },
  };
}

const book = createNoticeStore("book", () => loadNotifications());
const orders = createNoticeStore("orders", () => loadOrderNotices());

if (typeof window !== "undefined") {
  onNotificationSignal((signal) => {
    book.onSignal(signal);
    orders.onSignal(signal);
  });
}

// The guest book: the bell and /notifications.
export const ensureNotifications = book.ensure;
export const setBellOpen = book.setOpen;
export const syncNotificationsViewer = book.syncViewer;
/** The page opened the whole book. */
export const noteBookOpened = book.opened;
export const useNotifications = book.useStore;

// The order clipboard: commission notices.
export const ensureOrderNotices = orders.ensure;
export const setClipboardOpen = orders.setOpen;
export const syncOrderNoticesViewer = orders.syncViewer;
export const useOrderNotices = orders.useStore;
