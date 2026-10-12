"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Archive, ArchiveRestore, ChevronLeft, IdCard, Minus, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  loadEarlier,
  openThread,
  sendMessage,
  setArchived as saveArchived,
  startConversation,
  markRead,
} from "@/app/(site)/message-actions";
import { showToast } from "@/components/favorites/toast-events";
import { chatTopic, previewOf, type ChatMessage, type StoredChatImage, type ThreadView } from "@/lib/messages/types";
import { signMessageImages, uploadMessageImage } from "@/lib/messages/upload";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Composer, type Attachment } from "./composer";
import { PostageStamp, Seal } from "./postage";
import { StudioCard } from "./studio-card";
import { Thread } from "./thread";
import {
  closeChat,
  getViewerId,
  noteSent,
  onLive,
  openInbox,
  patchEntry,
  setMinimized,
  setOnScreen,
  useChatState,
} from "./store";

const OFFLINE = "Couldn't reach the studio. Try again in a moment.";
const TYPING_EVERY = 2500;
const TYPING_FOR = 4500;

/** Real messages in time order; ones still on their way stay at the end. */
const settle = (list: ChatMessage[]) => [
  ...list.filter((m) => !m.status).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)),
  ...list.filter((m) => m.status),
];

type Pending = { body: string; attachments: Attachment[]; uploaded?: StoredChatImage[] };

/**
 * One conversation in the chat window: who it's with, the thread, the
 * composer, and their studio card. Stays mounted while minimized (the dock
 * shows instead), so drafts, scroll and the live connection carry on.
 */
export function Conversation({ handle, minimized }: { handle: string; minimized: boolean }) {
  const viewerId = getViewerId();
  const router = useRouter();
  const signIn = useCallback(
    () => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`),
    [router],
  );
  const [thread, setThread] = useState<ThreadView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [theirReadAt, setTheirReadAt] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reload, setReload] = useState(0);

  const conversationRef = useRef<string | null>(null);
  useEffect(() => {
    conversationRef.current = conversationId;
  }, [conversationId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const readUpTo = useRef("");
  const pending = useRef(new Map<string, Pending>());
  const typingChannel = useRef<RealtimeChannel | null>(null);
  const typingSentAt = useRef(0);

  // Load (and reload after a lost connection).
  useEffect(() => {
    let cancelled = false;
    openThread(handle)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (result.signIn) return signIn();
          setFailure(result.error);
          return;
        }
        const t = result.thread;
        setThread(t);
        setFailure(null);
        // Keep anything still sending; take the server's word for the rest.
        setMessages((current) => settle([...t.messages, ...current.filter((m) => m.status)]));
        setConversationId(t.conversationId);
        setTheirReadAt(t.theirReadAt);
        setArchived(t.archived);
        setHasMore(t.hasMore);
      })
      .catch(() => !cancelled && setFailure(OFFLINE));
    return () => {
      cancelled = true;
    };
  }, [handle, reload, signIn]);

  // Is the conversation in front of the viewer right now?
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const onScreen = !minimized && visible;

  useEffect(() => {
    setOnScreen(onScreen ? conversationId : null);
    return () => setOnScreen(null);
  }, [onScreen, conversationId]);

  // Read receipts: everything of theirs on screen is read.
  const lastTheirs = messages.findLast((m) => !m.fromMe && !m.status);
  useEffect(() => {
    if (!onScreen || !conversationId || !lastTheirs || readUpTo.current >= lastTheirs.createdAt) return;
    readUpTo.current = lastTheirs.createdAt;
    patchEntry(conversationId, { unread: false });
    void markRead(conversationId, lastTheirs.createdAt).catch(() => {
      readUpTo.current = "";
    });
  }, [onScreen, conversationId, lastTheirs]);

  // Live: new messages, "seen", and catching up after a lost connection.
  useEffect(
    () =>
      onLive(async (event) => {
        if (event.type === "resync") return setReload((n) => n + 1);
        if (event.type === "read") {
          const { conversation_id, user_id, last_read_at } = event.read;
          if (conversation_id === conversationRef.current && user_id !== viewerId) {
            setTheirReadAt((current) => (current && current > last_read_at ? current : last_read_at));
          }
          return;
        }
        const m = event.message;
        if (m.conversation_id !== conversationRef.current) return;
        const fromMe = m.sender_id === viewerId;
        if (!fromMe) setTyping(false);
        const images = await signMessageImages(m.images).catch(() => []);
        setMessages((list) => {
          if (list.some((x) => x.id === m.id)) return list;
          // My own message echoing back before its send finished: the send will swap it in.
          if (fromMe && list.some((x) => x.status === "sending" && x.body === m.body)) return list;
          return settle([...list, { id: m.id, fromMe, body: m.body, images, createdAt: m.created_at }]);
        });
      }),
    [viewerId],
  );

  // Typing hints, over the conversation's own private channel.
  const demo = thread?.person.demo ?? true;
  useEffect(() => {
    if (!conversationId || demo) return;
    const supabase = supabaseBrowser();
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(chatTopic(conversationId), { config: { private: true, broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, ({ payload }: { payload?: { from?: string } }) => {
          if (payload?.from === viewerId) return;
          setTyping(true);
          clearTimeout(timer);
          timer = setTimeout(() => setTyping(false), TYPING_FOR);
        })
        .subscribe();
      typingChannel.current = channel;
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      typingChannel.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, demo, viewerId]);

  const announceTyping = useCallback(() => {
    const now = Date.now();
    if (!typingChannel.current || now - typingSentAt.current < TYPING_EVERY) return;
    typingSentAt.current = now;
    void typingChannel.current.send({ type: "broadcast", event: "typing", payload: { from: viewerId } });
  }, [viewerId]);

  // Scroll: start at the newest, follow new messages while the viewer is at the bottom.
  function onScroll() {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typing, thread]);
  // Pictures size the thread only once they load: keep following the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current && keepOffset.current === null) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [thread]);

  async function loadOlder() {
    const oldest = messages.find((m) => !m.status);
    const el = scrollRef.current;
    if (!conversationId || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    const page = await loadEarlier(conversationId, oldest.createdAt).catch(() => null);
    setLoadingOlder(false);
    if (!page) return;
    if (el) keepOffset.current = el.scrollHeight - el.scrollTop;
    setMessages((list) => settle([...page.messages, ...list.filter((m) => !page.messages.some((p) => p.id === m.id))]));
    setHasMore(page.hasMore);
  }

  async function deliver(tempId: string) {
    const job = pending.current.get(tempId);
    if (!job || !thread) return;
    setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m)));
    try {
      let id = conversationRef.current;
      if (job.attachments.length && !job.uploaded) {
        // Pictures upload into the conversation's folder, so it has to exist first.
        if (!id) {
          const started = await startConversation(handle);
          if (!started.ok) throw new Error(started.error);
          id = started.conversationId;
          setConversationId(id);
        }
        const target = id;
        job.uploaded = await Promise.all(job.attachments.map((a) => uploadMessageImage(a.image, target)));
      }
      const result = await sendMessage({ handle, conversationId: id, body: job.body, images: job.uploaded ?? [] });
      if (!result.ok) {
        if (result.signIn) signIn();
        throw new Error(result.error);
      }
      pending.current.delete(tempId);
      setConversationId(result.conversationId);
      conversationRef.current = result.conversationId;
      setMessages((list) =>
        settle(
          list.some((m) => m.id === result.message.id)
            ? list.filter((m) => m.id !== tempId)
            : list.map((m) => (m.id === tempId ? result.message : m)),
        ),
      );
      job.attachments.forEach((a) => URL.revokeObjectURL(a.image.previewUrl));
      setArchived(false);
      noteSent({
        id: result.conversationId,
        person: thread.person,
        last: { body: previewOf(job.body, job.attachments.length), fromMe: true, at: result.message.createdAt },
        unread: false,
        archived: false,
      });
    } catch (error) {
      setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      showToast({ message: error instanceof Error && error.message ? error.message : OFFLINE });
    }
  }

  function send(body: string, attachments: Attachment[]) {
    const tempId = `tmp-${crypto.randomUUID()}`;
    pending.current.set(tempId, { body, attachments });
    stickToBottom.current = true;
    setMessages((list) => [
      ...list,
      {
        id: tempId,
        fromMe: true,
        body,
        images: attachments.map((a) => ({ path: "", width: a.image.width, height: a.image.height, url: a.image.previewUrl })),
        createdAt: new Date().toISOString(),
        status: "sending",
      },
    ]);
    void deliver(tempId);
  }

  async function toggleArchive() {
    if (!conversationId || !thread) return;
    const next = !archived;
    const id = conversationId;
    const apply = (value: boolean) => {
      setArchived(value);
      patchEntry(id, { archived: value });
    };
    apply(next);
    const result = await saveArchived(id, next).catch(() => ({ ok: false }));
    if (!result.ok) {
      apply(!next);
      return showToast({ message: OFFLINE });
    }
    if (!next) return;
    closeChat();
    showToast({
      message: `Archived your letters with ${thread.person.displayName.split(" ")[0]}`,
      undo: () => {
        apply(false);
        void saveArchived(id, false);
      },
    });
  }

  const person = thread?.person;
  const first = person?.displayName.split(" ")[0] ?? `@${handle}`;
  const studio = thread?.card.studio;
  const statusLine = !person
    ? null
    : person.demo
      ? "Demo artist"
      : studio?.status === "open"
        ? "Commissions open"
        : studio?.status === "waitlist"
          ? "Commission waitlist"
          : null;

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-surface sm:rounded-panel sm:border sm:border-border sm:shadow-lift"
      style={person ? ({ "--tint": person.tint } as CSSProperties) : undefined}
    >
      <header className="flex items-center gap-2 border-b border-dashed border-border px-2 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <IconButton label="All messages" onClick={openInbox} className="sm:hidden">
          <ChevronLeft aria-hidden className="size-5" />
        </IconButton>
        {person ? (
          <Link
            href={`/${person.handle}`}
            onClick={() => setMinimized(true)}
            className="group/who flex min-w-0 items-center gap-3 rounded-[12px] py-0.5 pr-2"
          >
            <PostageStamp image={person.avatar} size={34} tilt={-4} />
            <span className="min-w-0">
              <span id="chat-title" className="block truncate font-display font-extrabold text-ink group-hover/who:underline">
                {person.displayName}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                <span className="truncate">@{person.handle}</span>
                {statusLine && (
                  <>
                    <span aria-hidden>·</span>
                    {studio?.status === "open" && !person.demo && (
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-mint-strong" />
                    )}
                    <span className="truncate">{statusLine}</span>
                  </>
                )}
              </span>
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-[39px] w-[34px] skeleton rounded-[3px] bg-ice" />
            <div>
              <div className="h-3.5 w-28 skeleton rounded-input bg-ice" />
              <div className="mt-1.5 h-3 w-20 skeleton rounded-input bg-ice" />
            </div>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {conversationId && (
            <IconButton label={archived ? "Move back to inbox" : "Archive conversation"} onClick={toggleArchive}>
              {archived ? <ArchiveRestore aria-hidden className="size-[1.125rem]" /> : <Archive aria-hidden className="size-[1.125rem]" />}
            </IconButton>
          )}
          {thread && (
            <IconButton
              label={cardOpen ? `Hide ${first}'s card` : `About ${first}`}
              onClick={() => setCardOpen((open) => !open)}
              className={`lg:hidden ${cardOpen ? "bg-ice text-ink" : ""}`}
              expanded={cardOpen}
            >
              <IdCard aria-hidden className="size-[1.125rem]" />
            </IconButton>
          )}
          <IconButton label="Minimize" onClick={() => setMinimized(true)} className="hidden sm:grid">
            <Minus aria-hidden className="size-5" />
          </IconButton>
          <IconButton label="Close messages" onClick={closeChat}>
            <X aria-hidden className="size-5" />
          </IconButton>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <section aria-labelledby="chat-title" className="chat-light flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {failure ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="font-display font-bold text-ink">{failure}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFailure(null);
                      setReload((n) => n + 1);
                    }}
                    className="mt-2 text-sm font-semibold text-ocean-ink hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : !thread ? (
              <ThreadSkeleton />
            ) : (
              <Thread
                person={thread.person}
                card={thread.card}
                messages={messages}
                theirReadAt={theirReadAt}
                typing={typing}
                hasMore={hasMore}
                loadingOlder={loadingOlder}
                onLoadOlder={loadOlder}
                onRetry={(id) => void deliver(id)}
              />
            )}
          </div>
          {thread && (
            <Composer
              handle={handle}
              first={first}
              empty={messages.length === 0}
              takingWork={thread.card.studio.status !== "closed"}
              firstService={thread.card.services[0]?.title}
              onSend={send}
              onTyping={announceTyping}
            />
          )}
        </section>

        {thread && (
          <aside
            aria-label={`About ${first}`}
            className={`overflow-y-auto overscroll-contain border-dashed border-border bg-canvas p-4 lg:static lg:block lg:w-[21rem] lg:shrink-0 lg:border-l ${
              cardOpen ? "absolute inset-0 z-10 block sm:left-auto sm:w-[21rem] sm:border-l sm:shadow-lift" : "hidden"
            }`}
          >
            <StudioCard card={thread.card} onNavigate={() => setMinimized(true)} />
          </aside>
        )}
      </div>

      {minimized && person && createPortal(<Dock person={person} />, document.body)}
    </div>
  );
}

/** The minimized chat: a letter tucked into the corner of the screen, sealed again when something new arrives. */
function Dock({ person }: { person: ThreadView["person"] }) {
  const { inbox } = useChatState();
  const unread = inbox?.some((e) => e.person.handle === person.handle && e.unread);
  return (
    <div className="fixed bottom-4 left-4 z-40 animate-rise sm:bottom-6 sm:left-6" style={{ "--tint": person.tint } as CSSProperties}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-2.5 shadow-lift">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 rounded-full pr-1.5 text-left"
          aria-label={`Open your messages with ${person.displayName}`}
        >
          <PostageStamp image={person.avatar} size={26} tilt={-5} />
          <span className="max-w-40 truncate text-sm font-semibold text-ink">{person.displayName}</span>
          {unread && (
            <>
              <Seal className="size-5" />
              <span className="sr-only">New message</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={closeChat}
          aria-label="Close messages"
          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  className = "",
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  expanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      className={`grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-busy aria-label="Loading messages" className="mx-auto flex w-full max-w-2xl flex-col items-center pt-6">
      <div className="aspect-[2.3/1] w-full max-w-[21rem] skeleton rounded-[6px] bg-ice" />
      <div className="mt-6 h-4 w-56 skeleton rounded-input bg-ice" />
      <div className="mt-2 h-3 w-72 skeleton rounded-input bg-ice" />
    </div>
  );
}
