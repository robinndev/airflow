"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AtSign,
  Bell,
  Brush,
  Heart,
  MessageCircle,
  Star,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { AppNotification, NotificationKind } from "@/lib/notifications";
import { HeaderMenu } from "./header-menu";

const KIND: Record<NotificationKind, { icon: LucideIcon; tint: string }> = {
  commission_request: { icon: Brush, tint: "bg-ocean text-white" },
  like: { icon: Heart, tint: "bg-like text-white [&_svg]:fill-current" },
  follow: { icon: UserPlus, tint: "bg-sky text-white" },
  comment: { icon: MessageCircle, tint: "bg-mint text-on-mint" },
  review: { icon: Star, tint: "bg-star text-white [&_svg]:fill-current" },
  mention: { icon: AtSign, tint: "bg-lilac text-white" },
  payout: { icon: Wallet, tint: "bg-mint text-on-mint" },
};

const TINTS = ["bg-sky/20 text-sky-ink", "bg-lilac/20 text-lilac-ink", "bg-mint/20 text-mint-ink"];

export function NotificationsMenu({ items }: { items: AppNotification[] | null }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [allRead, setAllRead] = useState(false);

  const isUnread = (n: AppNotification) => n.unread && !allRead;
  const unreadCount = items?.filter(isUnread).length ?? 0;
  const visible = (items ?? []).filter((n) => filter === "all" || isUnread(n));
  const fresh = visible.filter(isUnread);
  const earlier = visible.filter((n) => !isUnread(n));

  return (
    <HeaderMenu
      label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      panelClassName="sm:w-[26rem]"
      triggerClassName="relative grid size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice"
      trigger={
        <>
          <Bell aria-hidden className="size-[1.125rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-mint px-1 text-[0.625rem] font-bold text-on-mint ring-2 ring-surface">
              {unreadCount}
            </span>
          )}
        </>
      }
    >
      <div className="flex max-h-[min(36rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-lift">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <p className="font-display text-lg font-extrabold text-ink">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => setAllRead(true)}
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {items && (
          <div role="tablist" aria-label="Filter notifications" className="mt-3 flex gap-1.5 px-5">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                  filter === key ? "bg-ink text-on-ink" : "bg-ice text-ink hover:bg-ice-strong"
                }`}
              >
                {key === "all" ? "All" : "Unread"}
                {key === "unread" && unreadCount > 0 && (
                  <span className={filter === key ? "text-on-ink/70" : "text-muted"}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {!items ? (
            <EmptyState title="Sign in to see notifications" text="Follows, likes and commission requests show up here." />
          ) : visible.length === 0 ? (
            <EmptyState title="You're all caught up ✨" text="New likes, follows and requests will land here." />
          ) : (
            <>
              {fresh.length > 0 && <Group title="New" items={fresh} unread />}
              {earlier.length > 0 && <Group title="Earlier" items={earlier} />}
            </>
          )}
        </div>

        {items && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              className="w-full rounded-[12px] py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ice"
            >
              See all notifications
            </button>
          </div>
        )}
      </div>
    </HeaderMenu>
  );
}

function Group({ title, items, unread = false }: { title: string; items: AppNotification[]; unread?: boolean }) {
  return (
    <section className="pt-2">
      <h3 className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} unread={unread} />
        ))}
      </ul>
    </section>
  );
}

function NotificationItem({ notification: n, unread }: { notification: AppNotification; unread: boolean }) {
  const kind = KIND[n.kind];
  const Icon = kind.icon;

  return (
    <li>
      <Link
        href={n.href}
        prefetch={false}
        className={`group/notif flex items-start gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-ice/70 ${
          unread ? "bg-ice/45" : ""
        }`}
      >
        <span className="relative shrink-0">
          <ActorAvatar notification={n} />
          <span
            aria-hidden
            className={`absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-surface [&_svg]:size-2.5 ${kind.tint}`}
          >
            <Icon />
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug text-ink/90">
            {n.actor && <span className="font-semibold text-ink">@{n.actor.handle} </span>}
            {n.text}
            {n.target && <span className="font-semibold text-ink"> {n.target}</span>}
          </span>
          {n.quote && (
            <span className="mt-1.5 block truncate rounded-[8px] border-l-2 border-border bg-surface/70 py-1 pr-2 pl-2.5 text-xs text-muted">
              “{n.quote}”
            </span>
          )}
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            {unread && <span aria-label="Unread" className="size-1.5 rounded-full bg-ocean" />}
            {n.time} ago
          </span>
          {n.kind === "commission_request" && (
            <span className="mt-2.5 inline-flex h-8 items-center rounded-full bg-ocean px-3.5 text-xs font-semibold text-white transition group-hover/notif:brightness-95">
              View request
            </span>
          )}
          {n.kind === "follow" && (
            <span className="mt-2.5 inline-flex h-8 items-center rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-ink">
              Follow back
            </span>
          )}
        </span>

        {n.preview && (
          <Image
            src={n.preview.src}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-[10px] bg-ice object-cover"
          />
        )}
      </Link>
    </li>
  );
}

function ActorAvatar({ notification: n }: { notification: AppNotification }) {
  if (!n.actor) {
    return (
      <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-xs font-extrabold text-on-ink">
        A
      </span>
    );
  }
  if (n.actor.avatar) {
    return (
      <Image
        src={n.actor.avatar.src}
        alt=""
        width={44}
        height={44}
        className="size-11 rounded-full bg-ice object-cover"
        style={{ objectPosition: n.actor.avatar.focus }}
      />
    );
  }
  const tint = TINTS[n.actor.handle.length % TINTS.length];
  return (
    <span className={`grid size-11 place-items-center rounded-full font-display text-sm font-bold uppercase ${tint}`}>
      {n.actor.handle.replace(/[^a-z0-9]/gi, "").slice(0, 2)}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-display font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
