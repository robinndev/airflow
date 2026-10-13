"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { openCommentsAt } from "@/components/social/events";
import { useFollow } from "@/components/social/store";
import { Avatar } from "@/components/ui/avatar";
import type { AppNotification } from "@/lib/notifications/types";
import {
  AdmitOne,
  Bookplate,
  DateStamp,
  HeartStamps,
  KIND_INK,
  PenCircle,
  Print,
  RequestTicket,
  StatusStamp,
  tilt,
} from "./marks";
import { dayStamp, noteTime } from "./time";

/*
 * One line of the guest book, shared by the bell and /notifications. Marks
 * live in the margin (a face circled in pen, heart stamps for likes), what
 * happened is written on the line, and whatever they left sits on the right:
 * a taped print of the piece, a ticket stub for a request, a rubber stamp
 * for the artist's answer. The sentence is the link; the row stretches it.
 */

export type BookOwner = { name: string; handle: string; since?: string };

/** The margin left of the red rule (sets `--margin`; the list draws the rule there). */
export const MARGIN = { bell: "[--margin:3.5rem]", book: "[--margin:3.5rem] sm:[--margin:4.75rem]" } as const;

export function NoteList({
  items,
  owner,
  size = "bell",
}: {
  items: AppNotification[];
  owner: BookOwner;
  size?: keyof typeof MARGIN;
}) {
  const now = new Date();
  let day = "";
  const rows: ReactNode[] = [];
  for (const note of items) {
    const stamp = dayStamp(note.at, now);
    if (stamp !== day) {
      day = stamp;
      rows.push(
        <li key={`day-${note.id}`} className={size === "book" ? "pt-6 pb-1.5 pl-3" : "pt-4 pb-1 pl-2"}>
          <h3>
            <DateStamp>{stamp}</DateStamp>
          </h3>
        </li>,
      );
    }
    rows.push(<NoteEntry key={note.id} note={note} owner={owner} size={size} now={now} />);
  }
  return (
    <ul className={`relative ${MARGIN[size]}`}>
      {size === "book" && (
        // Printed at the top of every page, like a real guest book's columns.
        <li aria-hidden className="hidden grid-cols-[var(--margin)_minmax(0,1fr)_auto] border-b-[3px] border-double border-on-paper/12 pt-1 pr-6 pb-2 text-[0.5625rem] font-bold tracking-[0.22em] text-paper-muted uppercase sm:grid">
          <span className="text-center">Guest</span>
          <span className="pl-4">Remarks</span>
          <span>Left behind</span>
        </li>
      )}
      {/* The margin rule: two thin red lines down the page. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-(--margin) w-[3px] border-x border-like/35" />
      {rows}
    </ul>
  );
}

function NoteEntry({
  note,
  owner,
  size,
  now,
}: {
  note: AppNotification;
  owner: BookOwner;
  size: keyof typeof MARGIN;
  now: Date;
}) {
  const roomy = size === "book";
  if (note.kind === "welcome") {
    return (
      <li className={`relative ${roomy ? "py-6 pr-6 pl-[calc(var(--margin)+1.5rem)]" : "py-4 pr-4 pl-[calc(var(--margin)+1rem)]"}`}>
        <Bookplate name={owner.name} handle={owner.handle} since={owner.since} className="mx-auto max-w-[19rem]">
          <p className="mt-2.5 text-xs leading-relaxed text-pretty text-paper-muted">
            Likes, comments, follows and commission requests get signed in here.
          </p>
          <Link
            href={note.href}
            prefetch={false}
            className="mt-3 inline-flex h-8 items-center rounded-full bg-ocean px-3.5 text-xs font-semibold text-white transition-[filter] hover:brightness-105"
          >
            Set up your profile
          </Link>
        </Bookplate>
      </li>
    );
  }

  const ink = KIND_INK[note.kind];
  const wobble = tilt(note.id);
  const path = note.href.split(/[?#]/)[0];

  return (
    <li
      className={`group/note relative grid grid-cols-[var(--margin)_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-sky/25 transition-colors last:border-b-0 hover:bg-on-paper/[0.03] has-[a:focus-visible]:bg-on-paper/[0.04] ${
        roomy ? "py-5 pr-6" : "py-3.5 pr-4"
      } ${note.unread ? "bg-sky/[0.07]" : ""}`}
    >
      <span className={`grid justify-self-center pt-0.5 ${ink}`}>
        {note.kind === "like" ? (
          <HeartStamps palette={note.piece?.image?.palette} tally={note.tally} className={roomy ? "size-13" : ""} />
        ) : note.actor ? (
          <span className="relative">
            <Avatar image={{ ...note.actor.avatar, alt: "" }} size={roomy ? 48 : 40} className={roomy ? "size-12" : "size-10"} />
            <PenCircle rotate={wobble * 20} />
          </span>
        ) : null}
      </span>

      <div className={`min-w-0 ${roomy ? "pl-4" : "pl-3"}`}>
        <p className={`leading-snug text-pretty text-on-paper/85 ${roomy ? "text-[0.9375rem]" : "text-sm"}`}>
          <Link
            href={note.href}
            prefetch={false}
            onClick={() => note.thread && openCommentsAt(path, note.thread)}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            <Sentence note={note} />
          </Link>
        </p>
        {note.quote && (
          <span
            className={`pointer-events-none relative mt-2 block max-w-[36ch] bg-current/[0.09] px-3 pt-2 pb-1.5 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.1)] [clip-path:polygon(0_0,100%_3%,99.2%_35%,100%_64%,98.8%_100%,0_97%)] ${ink}`}
            style={{ rotate: `${wobble * 0.25}deg` }}
          >
            <span aria-hidden className="absolute -top-0.5 left-1 font-display text-xl leading-none font-extrabold">
              “
            </span>
            <span className={`pl-2.5 leading-snug text-on-paper/80 italic ${roomy ? "line-clamp-3 text-sm" : "line-clamp-2 text-[0.8125rem]"}`}>
              {note.quote}
            </span>
          </span>
        )}
        <span className="mt-1.5 flex items-center gap-1.5 text-xs text-paper-muted">
          <time dateTime={note.at}>{noteTime(note.at, now)}</time>
          {note.unread && (
            <>
              <InkDrop />
              <span className="font-semibold text-ocean-ink dark:text-ocean">New</span>
            </>
          )}
        </span>
        {roomy && (note.kind === "follow" || note.kind === "invite_joined") && note.actor && <Signature name={note.actor.name} tilt={wobble} />}
        {note.kind === "commission_request" && (
          <span className="mt-2.5 inline-flex h-8 items-center rounded-full bg-ocean px-3.5 text-xs font-semibold text-white transition-[filter] group-hover/note:brightness-105">
            View request
          </span>
        )}
      </div>

      <Side note={note} wobble={wobble} roomy={roomy} />
    </li>
  );
}

function Side({ note, wobble, roomy }: { note: AppNotification; wobble: number; roomy: boolean }) {
  if (note.kind === "follow") return note.actor && <FollowBack handle={note.actor.handle} />;
  // Clicks go through to the row's link.
  return (
    <span className="pointer-events-none pt-1">
      <Keepsake note={note} wobble={wobble} box={roomy ? 64 : 50} />
    </span>
  );
}

/** What they left: a print of the piece, a ticket stub, a stamp. */
function Keepsake({ note, wobble, box }: { note: AppNotification; wobble: number; box: number }) {
  switch (note.kind) {
    case "invite_joined":
      return <AdmitOne rotate={wobble * 1.5} />;
    case "commission_request":
      return note.commission && <RequestTicket estimateUsd={note.commission.estimateUsd} status={note.commission.status} rotate={wobble} />;
    case "request_update":
      return note.commission && <StatusStamp status={note.commission.status} rotate={wobble * 2 - 4} />;
    default:
      return note.piece?.image ? <Print image={note.piece.image} framed={note.kind === "repost"} rotate={wobble} box={box} /> : null;
  }
}

/** What happened, in words. Likes never name anyone: only how many. */
function Sentence({ note }: { note: AppNotification }) {
  const who = note.actor && <b className="font-semibold text-on-paper">{note.actor.name}</b>;
  const piece = note.piece?.excerpt ? <span className="text-on-paper">“{note.piece.excerpt}”</span> : "your post";
  const service = note.commission && <b className="font-semibold text-on-paper">{note.commission.service}</b>;

  switch (note.kind) {
    case "like":
      return (
        <>
          <b className="font-semibold text-on-paper">{note.tally === 1 ? "A new like" : `${note.tally} new likes`}</b> on {piece}
        </>
      );
    case "comment":
      return (
        <>
          {who} commented on {piece}
        </>
      );
    case "reply":
      return (
        <>
          {who} replied to your comment on {piece}
        </>
      );
    case "mention":
      return note.thread ? (
        <>
          {who} mentioned you in a comment on {piece}
        </>
      ) : (
        <>{who} mentioned you in a post</>
      );
    case "follow":
      return <>{who} started following you</>;
    case "repost":
      return (
        <>
          {who} reposted {piece}
        </>
      );
    case "invite_joined":
      return <>{who} joined Artiflow with your invite</>;
    case "commission_request":
      return note.commission?.status === "waitlisted" ? (
        <>
          {who} joined the waitlist for {service}
        </>
      ) : (
        <>
          {who} requested {service}
        </>
      );
    case "request_update": {
      const status = note.commission?.status;
      if (status === "accepted") return <>{who} accepted your request for {service}</>;
      if (status === "waitlisted") return <>{who} put your request for {service} on the waitlist</>;
      if (status === "declined") return <>{who} declined your request for {service}</>;
      if (status === "quoted") return <>{who} sent you a quote for {service}</>;
      if (status === "paid") return <>{who} paid for {service}</>;
      if (status === "in_progress") return <>{who} started your {service}</>;
      if (status === "delivered") return <>{who} delivered your {service}</>;
      if (status === "expired") return <>Your quote for {service} from {who} expired</>;
      return <>{who} cancelled their request for {service}</>;
    }
    case "welcome":
      return <>Welcome to Artiflow</>;
  }
}

function FollowBack({ handle }: { handle: string }) {
  const { following, toggle } = useFollow(handle);
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow @${handle}` : `Follow @${handle} back`}
      onClick={toggle}
      className={`relative z-10 inline-flex h-8 shrink-0 items-center self-center rounded-full px-3.5 text-xs font-semibold transition-[filter,background-color] ${
        following ? "border border-on-paper/20 text-on-paper hover:bg-on-paper/5" : "bg-ocean text-white hover:brightness-105"
      }`}
    >
      {following ? "Following" : "Follow back"}
    </button>
  );
}

/** Their name signed in the book by hand (decoration: the sentence already says who). */
function Signature({ name, tilt }: { name: string; tilt: number }) {
  return (
    <span aria-hidden className="mt-1 flex items-end gap-1 text-ocean-ink dark:text-ocean" style={{ rotate: `${tilt - 2}deg` }}>
      <span className="font-hand text-[1.65rem] leading-none font-bold">{name.split(" ")[0]}</span>
      <svg viewBox="0 0 60 16" className="mb-1 h-3 w-12" fill="none">
        <path d="M2 10c8-6 12 4 20-1s10-7 14-2 9 5 22-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Fresh ink, not dry yet: an unread notice. */
function InkDrop() {
  return (
    <svg aria-hidden viewBox="0 0 10 12" className="h-2.5 w-2 text-ocean">
      <path d="M5 .5C3.4 3.3 1 5.6 1 8a4 4 0 0 0 8 0C9 5.6 6.6 3.3 5 .5z" fill="currentColor" />
    </svg>
  );
}

/** Ruled lines that breathe while the book loads. */
export function NoteSkeleton({ rows = 4, size = "bell" }: { rows?: number; size?: keyof typeof MARGIN }) {
  return (
    <ul aria-hidden className={`relative ${MARGIN[size]}`}>
      <span className="pointer-events-none absolute inset-y-0 left-(--margin) w-[3px] border-x border-like/35" />
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[var(--margin)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-sky/25 py-4 pr-4">
          <span className="skeleton size-10 justify-self-center rounded-full" />
          <span className="grid gap-2 pl-3">
            <span className="skeleton h-3.5 rounded-full" style={{ width: `${78 - i * 9}%` }} />
            <span className="skeleton h-3 w-16 rounded-full" />
          </span>
          <span className="skeleton size-11 rounded-[3px]" />
        </li>
      ))}
    </ul>
  );
}
