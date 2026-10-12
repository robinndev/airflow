"use client";

import { MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { HeaderMenu } from "@/components/site/header-menu";
import { AlertToggles } from "./alert-toggles";
import { InboxList } from "./inbox-list";
import { ensureInbox, openChat, openInbox, syncViewer, useChatState, useUnreadCount, type ChatViewer } from "./store";

const TRIGGER =
  "relative size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice";

/** Rendered by the header: tells the chat who's signed in (null = visitor). */
export function MessagesSession({ viewer }: { viewer: ChatViewer | null }) {
  const id = viewer?.id;
  const handle = viewer?.handle;
  useEffect(() => syncViewer(id && handle ? { id, handle } : null), [id, handle]);
  return null;
}

/**
 * The header's Messages button. Wide screens get the inbox as a dropdown;
 * phones open it full screen in the chat window.
 */
export function MessagesMenu() {
  const unread = useUnreadCount();
  const { inbox, inboxFailed, open, arrivals } = useChatState();
  const label = unread ? `Messages, ${unread} unread` : "Messages";
  // The bubble swings each time a letter arrives.
  const icon = (
    <MessageCircle key={arrivals} aria-hidden className={`size-[1.125rem] ${arrivals ? "origin-bottom animate-swing" : ""}`} />
  );
  const badge = unread > 0 && (
    <span className="absolute -top-0.5 -right-0.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-mint px-1 text-[0.625rem] font-bold text-on-mint ring-2 ring-surface">
      {unread}
    </span>
  );

  return (
    <>
      {/* Phones narrower than 390px have no room in the header: the account menu carries Messages there. */}
      <button
        type="button"
        aria-label={label}
        title="Messages"
        onClick={openInbox}
        className={`${TRIGGER} hidden min-[390px]:grid sm:hidden`}
      >
        {icon}
        {badge}
      </button>
      {/* The inbox loads on the way to the button (hover, focus), not with every page. */}
      <div className="hidden sm:block" onPointerEnter={ensureInbox} onFocus={ensureInbox}>
        <HeaderMenu
          label={label}
          panelClassName="sm:w-[25rem]"
          triggerClassName={`${TRIGGER} grid`}
          trigger={
            <>
              {icon}
              {badge}
            </>
          }
        >
          {(close) => (
            <div className="flex max-h-[min(34rem,calc(100dvh-6rem))] min-h-80 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-lift">
              <div className="flex items-center justify-between gap-3 pt-3.5 pr-3 pb-2.5 pl-5">
                <p className="font-display text-lg font-extrabold text-ink">
                  Messages
                  {unread > 0 && <span className="ml-2 text-xs font-semibold text-muted">{unread} unread</span>}
                </p>
                <AlertToggles />
              </div>
              <InboxList
                entries={inbox}
                failed={inboxFailed}
                activeHandle={open?.view === "chat" ? open.handle : undefined}
                onOpen={(handle) => {
                  close();
                  openChat(handle);
                }}
              />
            </div>
          )}
        </HeaderMenu>
      </div>
    </>
  );
}

/** Unread conversations, for the account menu on narrow phones: a count beside "Messages", or just a dot. */
export function UnreadMessages({ dot = false, className = "" }: { dot?: boolean; className?: string }) {
  const unread = useUnreadCount();
  if (!unread) return null;
  if (dot) return <span aria-hidden className={`size-2.5 rounded-full bg-mint ring-2 ring-surface ${className}`} />;
  return (
    <span className={`rounded-full bg-mint px-2 py-0.5 text-[0.6875rem] font-bold text-on-mint ${className}`}>
      {unread}
      <span className="sr-only"> unread</span>
    </span>
  );
}
