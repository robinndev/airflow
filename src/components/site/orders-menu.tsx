"use client";

import Link from "next/link";
import { Brush, ClipboardList, Mail } from "lucide-react";
import { useEffect } from "react";
import { NoteList, NoteSkeleton, type BookOwner } from "@/components/notifications/entry";
import {
  ensureOrderNotices,
  setClipboardOpen,
  syncOrderNoticesViewer,
  useOrderNotices,
} from "@/components/notifications/store";
import { badgeCount } from "@/lib/notifications/types";
import { HeaderMenu } from "./header-menu";

export const ORDERS_TRIGGER =
  "relative grid size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice";

/**
 * The order clipboard: commission notices, apart from the guest book's
 * likes and follows so they never get lost in them (new requests, the
 * client's answers and payments for the artist; quotes, steps and
 * deliveries for the buyer). The pad is clipped to a board, newest on top,
 * with the way to My commissions and My requests at the bottom. Like the
 * bell, it loads on the way to the button and its badge rides the pulse;
 * opening it marks commission notices read (the new ones stay marked until
 * it closes).
 */
export function OrdersMenu({ viewer, owner, isArtist }: { viewer: string; owner: BookOwner; isArtist: boolean }) {
  const { items, failed, unread, rings } = useOrderNotices();
  useEffect(() => syncOrderNoticesViewer(viewer), [viewer]);

  const label = unread ? `Commissions, ${unread} unread` : "Commissions";
  const fresh = items?.filter((n) => n.unread).length ?? 0;

  return (
    <div data-orders-menu onPointerEnter={ensureOrderNotices} onFocus={ensureOrderNotices}>
      <HeaderMenu
        label={label}
        onOpenChange={setClipboardOpen}
        panelClassName="sm:w-[27rem]"
        triggerClassName={ORDERS_TRIGGER}
        trigger={
          <>
            {/* It swings on its nail each time something arrives. */}
            <ClipboardList key={rings} aria-hidden className={`size-[1.125rem] ${rings ? "origin-top animate-swing" : ""}`} />
            <OrdersBadge className="absolute -top-0.5 -right-0.5" />
          </>
        }
      >
        <div className="relative pt-4">
          <Clip className="absolute top-0 left-1/2 z-10 w-24 -translate-x-1/2" />
          {/* The board, and the order pad clipped to it: paper in both themes. */}
          <div className="rounded-[22px] bg-ice-strong p-2 shadow-lift ring-1 ring-border">
            <div className="grain flex max-h-[min(35rem,calc(100dvh-7.5rem))] flex-col overflow-hidden rounded-[8px] bg-paper text-on-paper ring-1 ring-on-paper/10">
              <header className="flex items-end justify-between gap-3 border-b-[3px] border-double border-on-paper/15 px-6 pt-6 pb-3">
                <div>
                  <p className="text-[0.5625rem] font-bold tracking-[0.24em] text-paper-muted uppercase">Order pad</p>
                  <p className="font-display text-lg leading-tight font-extrabold text-on-paper">Commissions</p>
                </div>
                {fresh > 0 && (
                  <span className="mb-0.5 text-xs font-semibold text-lilac-ink dark:text-lilac">{fresh} new</span>
                )}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {failed && !items ? (
                  <p className="px-6 py-12 text-center text-sm text-paper-muted">
                    The pad wouldn&apos;t load.{" "}
                    <button type="button" onClick={ensureOrderNotices} className="font-semibold text-ocean-ink underline dark:text-ocean">
                      Try again
                    </button>
                  </p>
                ) : !items ? (
                  <NoteSkeleton rows={3} />
                ) : items.length === 0 ? (
                  <p className="px-8 py-10 text-center text-sm text-pretty text-paper-muted">
                    Nothing on the pad yet.{" "}
                    {isArtist
                      ? "New requests, your clients' answers and what you ask for land here."
                      : "Quotes and news on the commissions you ask for land here."}
                  </p>
                ) : (
                  <NoteList items={items} owner={owner} />
                )}
              </div>

              <footer className={`grid gap-1 border-t border-on-paper/10 p-2 ${isArtist ? "grid-cols-2" : ""}`}>
                {isArtist && (
                  <Link href="/commissions" className={FOOTER_LINK}>
                    <Brush aria-hidden />
                    My commissions
                  </Link>
                )}
                <Link href="/requests" className={FOOTER_LINK}>
                  <Mail aria-hidden />
                  My requests
                </Link>
              </footer>
            </div>
          </div>
        </div>
      </HeaderMenu>
    </div>
  );
}

const FOOTER_LINK =
  "flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5 [&_svg]:size-4 [&_svg]:text-paper-muted";

/** Unread commission notices: the clipboard's badge (lilac, so it never reads as the bell's), or a dot where there's no room. */
export function OrdersBadge({ dot = false, className = "" }: { dot?: boolean; className?: string }) {
  const { unread } = useOrderNotices();
  if (!unread) return null;
  if (dot) return <span aria-hidden className={`size-2.5 rounded-full bg-lilac ring-2 ring-surface ${className}`} />;
  return (
    <span
      className={`grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-lilac-ink px-1 text-[0.625rem] font-bold text-surface ring-2 ring-surface ${className}`}
    >
      {badgeCount(unread)}
    </span>
  );
}

/** The board's metal clip, holding the pad: a plate with two rivets under a wire loop. */
function Clip({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 96 34" className={`pointer-events-none text-muted drop-shadow-sm ${className}`}>
      <path d="M33 16V9a7 7 0 0 1 7-7h16a7 7 0 0 1 7 7v7" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <rect x="6" y="13" width="84" height="19" rx="7" fill="currentColor" />
      <rect x="11" y="16" width="74" height="4" rx="2" className="fill-surface" opacity={0.35} />
      <circle cx="19" cy="25" r="2.25" className="fill-ink" opacity={0.3} />
      <circle cx="77" cy="25" r="2.25" className="fill-ink" opacity={0.3} />
    </svg>
  );
}
