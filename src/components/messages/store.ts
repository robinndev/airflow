"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { loadInbox } from "@/app/(site)/message-actions";
import {
  inboxTopic,
  previewOf,
  type InboxEntry,
  type MessageBroadcast,
  type ReadBroadcast,
} from "@/lib/messages/types";
import { supabaseBrowser } from "@/lib/supabase/browser";

/*
 * Direct messages in the browser: who's signed in, the inbox, which chat is
 * open, and the live connection. Pages stay static: the header tells the
 * store who's signed in (<MessagesSession>), the inbox loads once per viewer,
 * then the viewer's private `inbox:<id>` channel keeps it fresh. The chat
 * window lives in the (site) layout, so it stays open across navigation.
 */

export type ChatViewer = { id: string; handle: string };

/** What the chat window shows: the inbox (phones), or a conversation with someone. */
export type ChatView = { view: "inbox" } | { view: "chat"; handle: string };

type State = {
  /** Undefined until the header has streamed in; null for visitors. */
  viewer: ChatViewer | null | undefined;
  /** Null until loaded. */
  inbox: InboxEntry[] | null;
  inboxFailed: boolean;
  open: ChatView | null;
  minimized: boolean;
};

export type LiveEvent =
  | { type: "message"; message: MessageBroadcast }
  | { type: "read"; read: ReadBroadcast }
  /** The connection came back: anything may have been missed. */
  | { type: "resync" };

let state: State = { viewer: undefined, inbox: null, inboxFailed: false, open: null, minimized: false };
const listeners = new Set<() => void>();
const live = new Set<(event: LiveEvent) => void>();
let channel: RealtimeChannel | null = null;
/** The conversation on screen right now (open, not minimized), so new messages there aren't counted as unread. */
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

export function reloadInbox() {
  const viewer = state.viewer;
  if (!viewer) return;
  loadInbox()
    .then((inbox) => {
      if (state.viewer?.id !== viewer.id || !inbox) return;
      update({
        inbox: inbox.map((entry) => (entry.id === onScreen && isVisible() ? { ...entry, unread: false } : entry)),
        inboxFailed: false,
      });
    })
    .catch(() => {
      if (state.viewer?.id === viewer.id && !state.inbox) update({ inboxFailed: true });
    });
}

const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";

function onMessage(message: MessageBroadcast) {
  const viewer = state.viewer;
  if (!viewer) return;
  const entry = state.inbox?.find((e) => e.id === message.conversation_id);
  if (!entry) {
    // A new conversation: the inbox needs the other person's details.
    reloadInbox();
  } else {
    const fromMe = message.sender_id === viewer.id;
    const seeing = message.conversation_id === onScreen && isVisible();
    update({
      inbox: sortInbox(
        state.inbox!.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                last: { body: previewOf(message.body, message.images.length), fromMe, at: message.created_at },
                unread: fromMe || seeing ? false : true,
                archived: false,
              }
            : e,
        ),
      ),
    });
  }
  for (const listener of live) listener({ type: "message", message });
}

function onRead(read: ReadBroadcast) {
  // Read on another device of mine: it's not unread here either.
  if (read.user_id === state.viewer?.id) patchEntry(read.conversation_id, { unread: false });
  for (const listener of live) listener({ type: "read", read });
}

async function connect(viewer: ChatViewer) {
  const supabase = supabaseBrowser();
  await supabase.realtime.setAuth();
  if (state.viewer?.id !== viewer.id) return;
  let connectedBefore = false;
  channel = supabase
    .channel(inboxTopic(viewer.id), { config: { private: true } })
    .on("broadcast", { event: "message" }, ({ payload }: { payload: MessageBroadcast }) => onMessage(payload))
    .on("broadcast", { event: "read" }, ({ payload }: { payload: ReadBroadcast }) => onRead(payload))
    .subscribe((status: string) => {
      if (status !== "SUBSCRIBED") return;
      if (connectedBefore) {
        reloadInbox();
        for (const listener of live) listener({ type: "resync" });
      }
      connectedBefore = true;
    });
}

function disconnect() {
  if (channel) void supabaseBrowser().removeChannel(channel);
  channel = null;
}

/** Called by the header with the signed-in viewer: a new viewer starts from their own inbox. */
export function syncViewer(viewer: ChatViewer | null) {
  if (viewer?.id === state.viewer?.id && state.viewer !== undefined) return;
  disconnect();
  update({ viewer, inbox: null, inboxFailed: false, open: viewer ? state.open : null, minimized: false });
  if (!viewer) return;
  reloadInbox();
  void connect(viewer).catch(() => {});
}

export function patchEntry(id: string, patch: Partial<InboxEntry>) {
  if (!state.inbox?.some((e) => e.id === id)) return;
  update({ inbox: state.inbox.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

/** A message I just sent shows in the inbox right away (the live echo confirms it). */
export function noteSent(entry: InboxEntry) {
  const rest = (state.inbox ?? []).filter((e) => e.id !== entry.id);
  update({ inbox: sortInbox([entry, ...rest]) });
}

export function setOnScreen(conversationId: string | null) {
  onScreen = conversationId;
  if (conversationId) patchEntry(conversationId, { unread: false });
}

export function onLive(listener: (event: LiveEvent) => void) {
  live.add(listener);
  return () => {
    live.delete(listener);
  };
}

/** Open the chat with someone. False for visitors (send them to sign in). */
export function openChat(handle: string) {
  if (state.viewer === null) return false;
  update({ open: { view: "chat", handle }, minimized: false });
  return true;
}

/** The whole inbox in the chat window (phones, where the header has no room for a dropdown). */
export function openInbox() {
  if (!state.viewer) return;
  update({ open: { view: "inbox" }, minimized: false });
}

export function closeChat() {
  update({ open: null, minimized: false });
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
    () => state.inbox?.filter((e) => e.unread && !e.archived).length ?? 0,
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
