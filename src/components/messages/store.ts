"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { loadInbox } from "@/app/(site)/message-actions";
import { armChime, ringChime } from "@/lib/messages/chime";
import {
  inboxTopic,
  previewOf,
  type ChatPerson,
  type InboxEntry,
  type MessageBroadcast,
  type ReadBroadcast,
} from "@/lib/messages/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getAlertPrefs } from "./prefs";

/*
 * Direct messages in the browser: who's signed in, the inbox, which chat is
 * open, how new messages reach us and how they announce themselves. The chat
 * window lives in the (site) layout, so it stays open across navigation.
 *
 * Two ways to hear about new messages, chosen to keep Realtime connections
 * (capped per plan: 500 at once on Pro) for the people actually chatting:
 *
 * - Pulse (the default): the browser asks Supabase `message_pulse()` over
 *   plain HTTP: unread count, and when the newest message from someone else
 *   arrived. Tiny, and it never touches our server. One tab per browser asks
 *   and shares the answer; every 20s while you use the page, slower when you
 *   don't (see the rhythm below). Only when it changes is the inbox loaded.
 * - Live: while the chat window is open (or minimized), a WebSocket joins the
 *   viewer's private `inbox:<id>` channel, and the open conversation's
 *   `chat:<id>` (typing, presence). It closes 30s after the window does.
 *
 * The inbox itself loads lazily (opening the menu or the chat, or a pulse
 * that brings news); until then the header shows the pulse's unread count.
 *
 * A message that arrives while its conversation isn't in front of you is
 * announced: a letter slides in on the page (<IncomingLetter>), the header's
 * button swings, and one tab (the visible one, if any) rings the studio chime
 * and, in the background, raises a desktop alert if those are on.
 */

export type ChatViewer = { id: string; handle: string };

/** What the chat window shows: the inbox (phones), or a conversation with someone. */
export type ChatView = { view: "inbox" } | { view: "chat"; handle: string };

/** A new message, shown as a letter on the page until it's read or dismissed. */
export type Letter = { key: string; conversationId: string; person: ChatPerson; preview: string };

type State = {
  /** Undefined until the header has streamed in; null for visitors. */
  viewer: ChatViewer | null | undefined;
  /** Null until loaded. */
  inbox: InboxEntry[] | null;
  inboxFailed: boolean;
  /** Unread conversations per the last pulse, shown until the inbox is loaded. */
  unreadHint: number;
  open: ChatView | null;
  minimized: boolean;
  letter: Letter | null;
  /** Counts arrivals, so the header can swing its button on each one. */
  arrivals: number;
  connection: "pulse" | "connecting" | "live";
};

export type LiveEvent =
  | { type: "message"; message: MessageBroadcast }
  | { type: "read"; read: ReadBroadcast }
  /** Something may have been missed (the socket came back, or a pulse brought news): reload. */
  | { type: "resync" };

/*
 * Pulse rhythm, sized for thousands of people online at once, most of them
 * just browsing: one pulse per browser (its tabs share the answer), quick
 * while you're using the page, slower when you aren't, with a little jitter
 * so browsers don't all ask at the same second.
 */
/** The page is in front of you and you used it in the last 2 minutes. */
const PULSE_ACTIVE_MS = 20_000;
/** In front of you, untouched for 2+ minutes. */
const PULSE_IDLE_MS = 60_000;
/** Another tab or app is in front. */
const PULSE_HIDDEN_MS = 90_000;
/** In the background for 15+ minutes. */
const PULSE_DORMANT_MS = 300_000;
/** The chat is open but its socket is down (retrying): pulse often until it's back. */
const PULSE_CHATTING_MS = 5_000;
const IDLE_AFTER_MS = 2 * 60_000;
const DORMANT_AFTER_MS = 15 * 60_000;
/** The socket outlives the chat window a little, so closing and reopening doesn't reconnect. */
const SOCKET_GRACE_MS = 30_000;

/**
 * When a WebSocket is open. "chat" (default): only while the chat window is
 * open. "visible": also while the tab is in front, so letters arrive instantly
 * everywhere, at one Realtime connection per visible tab and no pulses from
 * it. Switch with NEXT_PUBLIC_MESSAGES_LIVE=visible once the plan's connection
 * quota allows it (Pro with the spend cap: 500; without it, $10 per 1,000).
 */
const LIVE_WHEN = process.env.NEXT_PUBLIC_MESSAGES_LIVE === "visible" ? "visible" : "chat";

/** `notes_*`: the same pulse carries notifications (absent on a database before that migration). */
type Pulse = { unread: number; latest: string | null; notes_unread?: number; notes_latest?: string | null };

/**
 * What the notifications store hears from here, so the site never opens a
 * second channel: each pulse's notification half (this tab's or a sibling's),
 * and notices that arrive live on the open chat socket.
 */
export type NotificationSignal = { type: "pulse"; unread: number; latest: string | null } | { type: "live"; at: string };

let state: State = {
  viewer: undefined,
  inbox: null,
  inboxFailed: false,
  unreadHint: 0,
  open: null,
  minimized: false,
  letter: null,
  arrivals: 0,
  connection: "pulse",
};
const listeners = new Set<() => void>();
const live = new Set<(event: LiveEvent) => void>();
const noteListeners = new Set<(signal: NotificationSignal) => void>();
let channel: RealtimeChannel | null = null;
let pulseTimer: ReturnType<typeof setTimeout> | undefined;
let graceTimer: ReturnType<typeof setTimeout> | undefined;
let inboxLoad: Promise<InboxEntry[] | null> | null = null;
/** Newest message from someone else that this tab already knows of (pulse baseline). */
let newestSeen: string | null | undefined;
let watching = false;
/** Tabs of this browser share their pulses, so only one of them asks. */
let tabs: BroadcastChannel | null = null;
let heardAt = 0;
let lastActive = Date.now();
let hiddenSince: number | null = null;
/** The conversation on screen right now (open, not minimized, tab visible): its messages need no announcing. */
let onScreen: string | null = null;

function update(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const sortInbox = (entries: InboxEntry[]) => entries.toSorted((a, b) => b.last.at.localeCompare(a.last.at));
const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";
const seeing = (conversationId: string) => conversationId === onScreen && isVisible();
const unreadIn = (inbox: InboxEntry[]) => inbox.filter((e) => e.unread && !e.archived).length;
const later = (a: string | null | undefined, b: string | null | undefined) => (!a ? b : !b ? a : a > b ? a : b);
const broadcast = (event: LiveEvent) => {
  for (const listener of live) listener(event);
};

/** Loads the inbox (one request at a time) and returns it. */
export function reloadInbox(): Promise<InboxEntry[] | null> {
  const viewer = state.viewer;
  if (!viewer) return Promise.resolve(null);
  inboxLoad ??= loadInbox()
    .then((inbox) => {
      if (state.viewer?.id !== viewer.id || !inbox) return null;
      const fresh = inbox.map((entry) => (seeing(entry.id) ? { ...entry, unread: false } : entry));
      update({ inbox: fresh, inboxFailed: false, unreadHint: unreadIn(fresh) });
      return fresh;
    })
    .catch(() => {
      if (state.viewer?.id === viewer.id && !state.inbox) update({ inboxFailed: true });
      return null;
    })
    .finally(() => {
      inboxLoad = null;
    });
  return inboxLoad;
}

/** The inbox is needed now (menu or chat opened): load it if it isn't yet. */
export function ensureInbox() {
  if (state.viewer && !state.inbox && !inboxLoad) void reloadInbox();
}

// Announcing ------------------------------------------------------------------

/**
 * Only one tab speaks for a message: the visible one answers at once, hidden
 * ones wait a moment and stand back if another tab already did.
 */
async function claim(key: string) {
  await new Promise((resolve) => setTimeout(resolve, isVisible() ? Math.random() * 40 : 250 + Math.random() * 250));
  try {
    const slot = `artiflow-letter:${key}`;
    if (localStorage.getItem(slot)) return false;
    localStorage.setItem(slot, "1");
    setTimeout(() => localStorage.removeItem(slot), 60_000);
  } catch {
    // No storage: every tab speaks for itself.
  }
  return true;
}

function desktopAlert(entry: InboxEntry) {
  if (isVisible() || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const icon = new URL(entry.person.avatar.src, window.location.origin).href;
  const alert = new Notification(entry.person.displayName, {
    body: entry.last.body,
    icon,
    tag: `artiflow-message-${entry.id}`,
    // The chime is the sound.
    silent: true,
  });
  alert.onclick = () => {
    window.focus();
    openChat(entry.person.handle);
    alert.close();
  };
}

function announceArrival(entry: InboxEntry) {
  // Keyed by conversation and time, so tabs that heard it live and tabs that pulsed agree.
  const key = `${entry.id}:${entry.last.at}`;
  update({
    arrivals: state.arrivals + 1,
    letter: { key, conversationId: entry.id, person: entry.person, preview: entry.last.body },
  });
  void claim(key).then((mine) => {
    if (!mine) return;
    const prefs = getAlertPrefs();
    if (prefs.sound) ringChime(entry.person.handle);
    if (prefs.desktop) desktopAlert(entry);
  });
}

// Pulse -------------------------------------------------------------------------

function pulseEvery() {
  if (state.open) return PULSE_CHATTING_MS;
  if (!isVisible()) {
    return hiddenSince && Date.now() - hiddenSince > DORMANT_AFTER_MS ? PULSE_DORMANT_MS : PULSE_HIDDEN_MS;
  }
  return Date.now() - lastActive < IDLE_AFTER_MS ? PULSE_ACTIVE_MS : PULSE_IDLE_MS;
}

function schedulePulse(delay?: number) {
  clearTimeout(pulseTimer);
  if (!state.viewer || state.connection === "live") return;
  // ±15%, so thousands of browsers don't pulse in step.
  const wait = delay ?? pulseEvery() * (0.85 + Math.random() * 0.3);
  pulseTimer = setTimeout(() => void pulse(), wait);
}

/** Asks Supabase whether anything changed (unless another tab just did) and shares the answer with the other tabs. */
async function pulse() {
  const viewer = state.viewer;
  if (!viewer) return;
  try {
    if (Date.now() - heardAt < pulseEvery() * 0.8) return;
    const { data: row } = await supabaseBrowser().rpc("message_pulse").single();
    const data = row as Pulse | null;
    if (!data || state.viewer?.id !== viewer.id) return;
    tabs?.postMessage({ type: "pulse", viewer: viewer.id, data });
    await takePulse(data);
  } catch {
    // Offline for a moment: the next pulse tries again.
  } finally {
    schedulePulse();
  }
}

/** What a pulse says: load the inbox and announce arrivals only if something changed. */
async function takePulse(data: Pulse) {
  if (typeof data.notes_unread === "number") {
    signalNotes({ type: "pulse", unread: data.notes_unread, latest: data.notes_latest ?? null });
  }
  const since = newestSeen;
  newestSeen = later(newestSeen, data.latest);
  // First pulse: just the baseline (and the badge).
  if (since === undefined) {
    if (!state.inbox) update({ unreadHint: data.unread });
    return;
  }
  if (data.latest && (!since || data.latest > since)) {
    const inbox = await reloadInbox();
    for (const entry of inbox ?? []) {
      if (entry.unread && !entry.last.fromMe && (!since || entry.last.at > since)) announceArrival(entry);
    }
    broadcast({ type: "resync" });
  } else if (state.inbox ? data.unread !== unreadIn(state.inbox) : data.unread !== state.unreadHint) {
    // Read (or archived) on another device.
    if (state.inbox) void reloadInbox();
    else update({ unreadHint: data.unread });
  }
}

function listenToTabs() {
  if (tabs || typeof BroadcastChannel === "undefined") return;
  tabs = new BroadcastChannel("artiflow-messages");
  tabs.onmessage = (event: MessageEvent<{ type?: string; viewer?: string; data?: Pulse }>) => {
    const note = event.data;
    if (note?.type !== "pulse" || !note.data || note.viewer !== state.viewer?.id) return;
    heardAt = Date.now();
    void takePulse(note.data);
    schedulePulse();
  };
}

// Live socket ---------------------------------------------------------------------

function onMessage(message: MessageBroadcast) {
  const viewer = state.viewer;
  if (!viewer) return;
  const fromMe = message.sender_id === viewer.id;
  if (!fromMe) newestSeen = later(newestSeen, message.created_at);
  const entry = state.inbox?.find((e) => e.id === message.conversation_id);
  if (!entry) {
    // A new conversation (or an inbox not loaded yet): it needs the other person's details.
    void reloadInbox().then((inbox) => {
      const fresh = inbox?.find((e) => e.id === message.conversation_id);
      if (fresh && !fromMe && !seeing(fresh.id) && fresh.last.at === message.created_at) announceArrival(fresh);
    });
  } else {
    const updated: InboxEntry = {
      ...entry,
      last: { body: previewOf(message.body, message.images.length), fromMe, at: message.created_at },
      unread: !fromMe && !seeing(entry.id),
      archived: false,
    };
    const inbox = sortInbox(state.inbox!.map((e) => (e.id === entry.id ? updated : e)));
    update({ inbox, unreadHint: unreadIn(inbox) });
    if (!fromMe && !seeing(entry.id)) announceArrival(updated);
  }
  broadcast({ type: "message", message });
}

function onRead(read: ReadBroadcast) {
  // Read on another device of mine: it's not unread here either.
  if (read.user_id === state.viewer?.id) {
    patchEntry(read.conversation_id, { unread: false });
    if (state.letter?.conversationId === read.conversation_id) update({ letter: null });
  }
  broadcast({ type: "read", read });
}

async function connect(viewer: ChatViewer) {
  const supabase = supabaseBrowser();
  update({ connection: "connecting" });
  await supabase.realtime.setAuth();
  if (state.viewer?.id !== viewer.id || channel) return;
  let connectedBefore = false;
  channel = supabase
    .channel(inboxTopic(viewer.id), { config: { private: true } })
    .on("broadcast", { event: "message" }, ({ payload }: { payload: MessageBroadcast }) => onMessage(payload))
    .on("broadcast", { event: "read" }, ({ payload }: { payload: ReadBroadcast }) => onRead(payload))
    .on("broadcast", { event: "notification" }, ({ payload }: { payload: { at: string } }) =>
      signalNotes({ type: "live", at: payload.at }),
    )
    .subscribe((status: string) => {
      if (state.viewer?.id !== viewer.id || !channel) return;
      if (status !== "SUBSCRIBED") {
        // Supabase keeps retrying; meanwhile, pulse often so nothing is missed.
        update({ connection: "connecting" });
        schedulePulse(PULSE_CHATTING_MS);
        return;
      }
      update({ connection: "live" });
      clearTimeout(pulseTimer);
      // One last check for anything that arrived between the last pulse and now (no more are scheduled while live).
      void pulse();
      if (connectedBefore) broadcast({ type: "resync" });
      connectedBefore = true;
    });
}

function disconnect() {
  clearTimeout(graceTimer);
  graceTimer = undefined;
  const closing = channel;
  channel = null;
  if (closing) {
    const supabase = supabaseBrowser();
    // The grace period already passed: close the WebSocket now rather than when Supabase gets to it (~50s).
    void supabase.removeChannel(closing).then(() => {
      if (!channel && supabase.getChannels().length === 0) void supabase.realtime.disconnect();
    });
  }
  if (state.connection !== "pulse") update({ connection: "pulse" });
}

/** A socket while the chat window is open (or minimized; or the tab is visible, see LIVE_WHEN); back to pulses a little after. */
function syncSocket() {
  const viewer = state.viewer;
  if (viewer && (state.open || (LIVE_WHEN === "visible" && isVisible()))) {
    clearTimeout(graceTimer);
    graceTimer = undefined;
    if (!channel && state.connection !== "connecting") {
      void connect(viewer).catch(() => {
        update({ connection: "pulse" });
        schedulePulse(PULSE_CHATTING_MS);
      });
    }
    return;
  }
  if (channel && !graceTimer) {
    graceTimer = setTimeout(() => {
      disconnect();
      schedulePulse(0);
    }, SOCKET_GRACE_MS);
  }
}

/** Coming back to the tab or online: check right away. Using the page again after a while: check soon. */
function watchPage() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const check = () => {
    hiddenSince = isVisible() ? null : (hiddenSince ?? Date.now());
    if (!state.viewer) return;
    syncSocket();
    if (state.connection !== "live") schedulePulse(isVisible() ? 0 : undefined);
  };
  const touched = () => {
    const now = Date.now();
    const wasIdle = now - lastActive > IDLE_AFTER_MS;
    lastActive = now;
    if (wasIdle && state.viewer && state.connection !== "live") schedulePulse(800);
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", check);
  for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    window.addEventListener(type, touched, { passive: true, capture: true });
  }
}

/** Called by the header with the signed-in viewer: a new viewer starts from their own inbox. */
export function syncViewer(viewer: ChatViewer | null) {
  if (viewer?.id === state.viewer?.id && state.viewer !== undefined) return;
  disconnect();
  clearTimeout(pulseTimer);
  newestSeen = undefined;
  update({
    viewer,
    inbox: null,
    inboxFailed: false,
    unreadHint: 0,
    open: viewer ? state.open : null,
    minimized: false,
    letter: null,
    connection: "pulse",
  });
  if (!viewer) return;
  armChime();
  watchPage();
  listenToTabs();
  schedulePulse(Math.random() * 1500);
  if (state.open) ensureInbox();
  syncSocket();
}

// Inbox edits from the window ------------------------------------------------------

export function patchEntry(id: string, patch: Partial<InboxEntry>) {
  if (!state.inbox?.some((e) => e.id === id)) return;
  const inbox = state.inbox.map((e) => (e.id === id ? { ...e, ...patch } : e));
  update({ inbox, unreadHint: unreadIn(inbox) });
}

/** A message I just sent shows in the inbox right away (the live echo confirms it). */
export function noteSent(entry: InboxEntry) {
  if (!state.inbox) return;
  update({ inbox: sortInbox([entry, ...state.inbox.filter((e) => e.id !== entry.id)]) });
}

export function setOnScreen(conversationId: string | null) {
  onScreen = conversationId;
  if (!conversationId) return;
  patchEntry(conversationId, { unread: false });
  if (state.letter?.conversationId === conversationId) update({ letter: null });
}

export function dismissLetter(key: string) {
  if (state.letter?.key === key) update({ letter: null });
}

function signalNotes(signal: NotificationSignal) {
  for (const listener of noteListeners) listener(signal);
}

/** For the notifications store: pulses and live notices (see NotificationSignal). */
export function onNotificationSignal(listener: (signal: NotificationSignal) => void) {
  noteListeners.add(listener);
  return () => {
    noteListeners.delete(listener);
  };
}

export function onLive(listener: (event: LiveEvent) => void) {
  live.add(listener);
  return () => {
    live.delete(listener);
  };
}

// Opening and closing ----------------------------------------------------------------

/** Open the chat with someone. False for visitors (send them to sign in). */
export function openChat(handle: string) {
  if (state.viewer === null) return false;
  update({
    open: { view: "chat", handle },
    minimized: false,
    letter: state.letter?.person.handle === handle ? null : state.letter,
  });
  ensureInbox();
  syncSocket();
  return true;
}

/** The whole inbox in the chat window (phones, where the header has no room for a dropdown). */
export function openInbox() {
  if (!state.viewer) return;
  update({ open: { view: "inbox" }, minimized: false });
  ensureInbox();
  syncSocket();
}

export function closeChat() {
  update({ open: null, minimized: false });
  syncSocket();
}

export function setMinimized(minimized: boolean) {
  if (state.open) update({ minimized });
}

export function useChatState() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function useUnreadCount() {
  return useSyncExternalStore(
    subscribe,
    () => (state.inbox ? unreadIn(state.inbox) : state.unreadHint),
    () => 0,
  );
}

export function getViewerId() {
  return state.viewer?.id ?? null;
}

/** Unsent words per person, kept while the page is open (closing the window doesn't lose them). */
const drafts = new Map<string, string>();

export const readDraft = (handle: string) => drafts.get(handle) ?? "";

export function saveDraft(handle: string, body: string) {
  if (body) drafts.set(handle, body);
  else drafts.delete(handle);
}
