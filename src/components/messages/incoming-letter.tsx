"use client";

import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { PostageStamp, Seal } from "./postage";
import { dismissLetter, openChat, useChatState, useUnreadCount } from "./store";

const SHOWN_FOR_MS = 8000;

// Airmail edging along the top of the envelope.
const AIRMAIL =
  "repeating-linear-gradient(-45deg, var(--like) 0 9px, var(--paper) 9px 14px, var(--ocean) 14px 23px, var(--paper) 23px 28px)";

/**
 * A new message while its conversation isn't in front of you: an airmail
 * letter drops onto the corner of the page, sealed in the sender's color.
 * Reply opens the conversation; it leaves by itself after a few seconds
 * (hovering holds it). Phones get it at the top, under the header.
 */
export function IncomingLetter() {
  const { letter, open, minimized } = useChatState();
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!letter || held) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The clock only runs while the page is visible: come back to the tab, the letter is still there.
    const arm = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(() => dismissLetter(letter.key), SHOWN_FOR_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [letter, held]);

  if (!letter) return null;
  const { person } = letter;
  const first = person.displayName.split(" ")[0];
  const reply = () => openChat(person.handle);

  return (
    <div
      className={`pointer-events-none fixed inset-x-3 top-[4.5rem] z-50 flex justify-center sm:inset-x-auto sm:top-auto sm:left-6 sm:justify-start ${
        open && minimized ? "sm:bottom-24" : "sm:bottom-6"
      }`}
    >
      <div
        key={letter.key}
        role="status"
        aria-live="polite"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        style={{ "--tint": person.tint } as CSSProperties}
        className="letter-in pointer-events-auto relative w-full max-w-[22rem]"
      >
        <div className="grain overflow-hidden rounded-[6px] bg-paper text-on-paper shadow-lift ring-1 ring-black/5">
          <div aria-hidden className="h-1.5" style={{ background: AIRMAIL }} />
          <button type="button" onClick={reply} className="flex w-full items-start gap-3 px-3.5 pt-3 pb-2.5 pr-11 text-left">
            <PostageStamp image={person.avatar} size={40} tilt={4} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">New letter</span>
              <span className="block truncate font-display font-extrabold">{person.displayName}</span>
              <span className="mt-0.5 line-clamp-2 text-sm text-paper-muted">{letter.preview}</span>
            </span>
          </button>
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-black/10 py-2 pr-2 pl-3.5">
            <UnreadNote />
            <button
              type="button"
              onClick={reply}
              className="inline-flex h-8 items-center rounded-full bg-ocean px-3.5 text-xs font-semibold text-white transition-[filter] hover:brightness-95"
            >
              Reply to {first}
            </button>
          </div>
        </div>
        <Seal className="absolute -top-2.5 -left-2.5 size-8 animate-stamp" />
        <button
          type="button"
          onClick={() => dismissLetter(letter.key)}
          aria-label="Dismiss"
          className="absolute top-3.5 right-2 grid size-8 place-items-center rounded-full text-paper-muted transition-colors hover:bg-black/5 hover:text-on-paper"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function UnreadNote() {
  const unread = useUnreadCount();
  return (
    <span className="font-hand text-[1.0625rem] leading-none font-semibold text-paper-muted">
      {unread > 1 ? `${unread} letters waiting` : "just arrived"}
    </span>
  );
}
