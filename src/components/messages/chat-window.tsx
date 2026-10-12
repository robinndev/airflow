"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { AlertToggles } from "./alert-toggles";
import { Conversation } from "./conversation";
import { IncomingLetter } from "./incoming-letter";
import { InboxList } from "./inbox-list";
import { TabBadge } from "./tab-badge";
import { closeChat, openChat, setMinimized, useChatState } from "./store";

/**
 * The chat window, one per site (it lives in the (site) layout, so it stays
 * open across pages). A large modal on wide screens, full screen on phones.
 * Clicking outside tucks it into the corner instead of closing it, so the
 * page underneath (their gallery, their prices) is one click away.
 */
export function ChatWindow() {
  const { viewer, open, minimized, inbox, inboxFailed } = useChatState();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shown = Boolean(viewer && open && !minimized);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (shown && !dialog.open) dialog.showModal();
    if (!shown && dialog.open) dialog.close();
  }, [shown]);

  if (!viewer) return null;

  return (
    <>
      <TabBadge />
      <IncomingLetter />
      <dialog
        ref={dialogRef}
        aria-label={open?.view === "chat" ? `Messages with @${open.handle}` : "Messages"}
        onCancel={(event) => {
          event.preventDefault();
          closeChat();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMinimized(true);
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim/45 backdrop:backdrop-blur-[2px] open:animate-rise sm:m-auto sm:h-[min(46rem,calc(100dvh-3rem))] sm:w-[min(68rem,calc(100vw-3rem))]"
      >
        {open?.view === "chat" ? (
          <Conversation key={open.handle} handle={open.handle} minimized={minimized} />
        ) : open?.view === "inbox" ? (
          <div className="flex h-full flex-col overflow-hidden bg-surface sm:rounded-panel sm:border sm:border-border sm:shadow-lift">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              <p className="font-display text-lg font-extrabold text-ink">Messages</p>
              <div className="-mr-2 flex items-center gap-1">
                <AlertToggles />
                <button
                  type="button"
                  onClick={closeChat}
                  aria-label="Close messages"
                  className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </div>
            <InboxList entries={inbox} failed={inboxFailed} onOpen={openChat} />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
