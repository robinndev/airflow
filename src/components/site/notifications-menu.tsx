"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { NoteList, NoteSkeleton, type BookOwner } from "@/components/notifications/entry";
import { Ribbon } from "@/components/notifications/marks";
import {
  ensureNotifications,
  setBellOpen,
  syncNotificationsViewer,
  useNotifications,
} from "@/components/notifications/store";
import { badgeCount } from "@/lib/notifications/types";
import { HeaderMenu } from "./header-menu";

/**
 * The bell: today's page of your guest book. It loads on the way to the
 * button (hover, focus) or when it opens, never with the page; the badge
 * comes from the pulse. Opening it marks everything read (the new ones stay
 * marked until it closes).
 */
export function NotificationsMenu({ viewer, owner }: { viewer: string; owner: BookOwner }) {
  const { items, failed, unread, rings } = useNotifications();
  useEffect(() => syncNotificationsViewer(viewer), [viewer]);

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  const fresh = items?.filter((n) => n.unread).length ?? 0;

  return (
    <div onPointerEnter={ensureNotifications} onFocus={ensureNotifications}>
      <HeaderMenu
        label={label}
        onOpenChange={setBellOpen}
        panelClassName="sm:w-[27rem]"
        triggerClassName="relative grid size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice"
        trigger={
          <>
            {/* It rings each time something arrives. */}
            <Bell key={rings} aria-hidden className={`size-[1.125rem] ${rings ? "origin-top animate-swing" : ""}`} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-mint px-1 text-[0.625rem] font-bold text-on-mint ring-2 ring-surface">
                {badgeCount(unread)}
              </span>
            )}
          </>
        }
      >
        <div className="relative pt-2">
          <Ribbon className="top-0 right-9 z-10 h-16" />
          {/* A page of the book: paper in both themes, bound on the left. */}
          <div className="grain flex max-h-[min(36rem,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-[6px_20px_20px_6px] bg-paper text-on-paper shadow-lift ring-1 ring-on-paper/10">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-linear-to-r from-on-paper/12 to-transparent"
            />
            <header className="flex items-end justify-between gap-3 border-b-[3px] border-double border-on-paper/15 pt-4 pr-16 pb-3 pl-6">
              <div>
                <p className="text-[0.5625rem] font-bold tracking-[0.24em] text-paper-muted uppercase">Guest book</p>
                <p className="font-display text-lg leading-tight font-extrabold text-on-paper">Notifications</p>
              </div>
              {fresh > 0 && (
                <span className="mb-0.5 text-xs font-semibold text-ocean-ink dark:text-ocean">{fresh} new</span>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {failed && !items ? (
                <p className="px-6 py-12 text-center text-sm text-paper-muted">
                  The book wouldn&apos;t open.{" "}
                  <button type="button" onClick={ensureNotifications} className="font-semibold text-ocean-ink underline dark:text-ocean">
                    Try again
                  </button>
                </p>
              ) : !items ? (
                <NoteSkeleton />
              ) : (
                <>
                  <NoteList items={items} owner={owner} />
                  {items.every((n) => n.kind === "welcome") && (
                    <p className="px-8 pb-6 text-center text-sm text-pretty text-paper-muted">
                      Nobody has signed it yet. Post something: likes, comments and follows will land here.
                    </p>
                  )}
                </>
              )}
            </div>

            <footer className="border-t border-on-paper/10 p-2">
              <Link
                href="/notifications"
                className="flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5"
              >
                See all notifications
                <span aria-hidden>→</span>
              </Link>
            </footer>
          </div>
        </div>
      </HeaderMenu>
    </div>
  );
}
