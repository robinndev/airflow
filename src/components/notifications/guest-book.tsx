"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { loadNotifications, loadWeekTally } from "@/app/(site)/notification-actions";
import { Tape } from "@/components/explore/doodles";
import { Avatar } from "@/components/ui/avatar";
import { isShow, SHOWS, type AppNotification, type NoteActor, type Show, type WeekTally } from "@/lib/notifications/types";
import { glowOf } from "@/lib/palette";
import { NoteList, NoteSkeleton, type BookOwner } from "./entry";
import { HeartStamps, TallyMarks, TetheredPen } from "./marks";
import { noteBookOpened } from "./store";

/*
 * /notifications: the whole guest book, open on the table. The left page
 * counts the week in tally marks; the right page is everyone who signed,
 * day by day, with sticky page flags along its top edge as filters (the URL
 * is the state: `?show=`). Opening it marks everything read; what was new
 * stays marked "New" while you're here.
 */

const FLAG_TONE: Record<Show, string> = {
  all: "var(--paper-muted)",
  comments: "var(--mint)",
  likes: "var(--like)",
  follows: "var(--ocean)",
  reposts: "var(--sky)",
  requests: "var(--lilac)",
};

const EMPTY: Record<Show, string> = {
  all: "Nobody has signed your book yet.",
  comments: "No comments, replies or mentions yet.",
  likes: "No likes yet.",
  follows: "No new followers yet.",
  reposts: "Nobody has reposted your work yet.",
  requests: "No commission requests yet.",
};

const TALLY_ROWS: { key: keyof WeekTally; label: string; ink: string }[] = [
  { key: "likes", label: "Likes", ink: "text-like" },
  { key: "comments", label: "Comments", ink: "text-mint-ink dark:text-mint" },
  { key: "follows", label: "Followers", ink: "text-ocean-ink dark:text-ocean" },
  { key: "reposts", label: "Reposts", ink: "text-sky-ink dark:text-sky" },
  { key: "requests", label: "Requests", ink: "text-lilac-ink dark:text-lilac" },
];

type Book = { show: Show; items: AppNotification[]; more: boolean };

type Highlights = { loved?: AppNotification; faces: NoteActor[] };

/** The week's most liked piece and the people who started following, from the newest page. */
function highlightsOf(items: AppNotification[]): Highlights {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recent = items.filter((n) => n.at >= since);
  const loved = recent
    .filter((n) => n.kind === "like" && n.piece?.image)
    .reduce<AppNotification | undefined>((best, n) => (!best || n.tally > best.tally ? n : best), undefined);
  const faces = new Map<string, NoteActor>();
  for (const n of recent) if (n.kind === "follow" && n.actor) faces.set(n.actor.handle, n.actor);
  return { loved, faces: [...faces.values()].slice(0, 7) };
}

export function GuestBook({ owner }: { owner: BookOwner }) {
  const params = useSearchParams();
  const show: Show = isShow(params.get("show")) ? (params.get("show") as Show) : "all";
  const [book, setBook] = useState<Book | null>(null);
  /** The filter whose page wouldn't load. */
  const [failedShow, setFailedShow] = useState<Show | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [week, setWeek] = useState<WeekTally | null>(null);
  const [highlights, setHighlights] = useState<Highlights | null>(null);

  useEffect(() => {
    let current = true;
    loadNotifications(show)
      .then((page) => {
        if (!current) return;
        if (!page) return setFailedShow(show);
        setFailedShow(null);
        setBook({ show, items: page.items, more: page.more });
        if (show === "all") setHighlights(highlightsOf(page.items));
        if (page.unread > 0) noteBookOpened();
      })
      .catch(() => current && setFailedShow(show));
    return () => {
      current = false;
    };
  }, [show]);

  useEffect(() => {
    loadWeekTally()
      .then(setWeek)
      .catch(() => undefined);
  }, []);

  async function loadMore() {
    if (!book || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadNotifications(book.show, book.items.at(-1)?.at);
      if (page) setBook((b) => (b?.show === book.show ? { ...b, items: [...b.items, ...page.items], more: page.more } : b));
    } finally {
      setLoadingMore(false);
    }
  }

  const shown = book?.show === show ? book : null;
  const failed = failedShow === show && !shown;

  return (
    <div className="relative">
      {/* Sticky page flags, tucked behind the right page's top edge. */}
      <nav
        aria-label="Filter notifications"
        className="relative z-0 -mb-3 flex gap-1.5 overflow-x-auto px-3 pt-3 [scrollbar-width:none] lg:ml-[39%] lg:px-8"
      >
        {SHOWS.map((flag) => {
          const active = flag.id === show;
          return (
            <Link
              key={flag.id}
              href={flag.id === "all" ? "/notifications" : `/notifications?show=${flag.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-t-[7px] px-3.5 pt-2 pb-5 text-xs font-bold text-on-paper shadow-[0_-1px_3px_rgb(var(--shadow-rgb)/0.12)] transition-transform ${
                active ? "-translate-y-1.5" : "hover:-translate-y-0.5"
              }`}
              style={{ background: `color-mix(in oklab, ${FLAG_TONE[flag.id]} ${active ? 46 : 22}%, var(--paper))` }}
            >
              {flag.label}
            </Link>
          );
        })}
      </nav>

      <TetheredPen className="absolute -top-12 -right-10 z-20 hidden h-44 w-16 xl:block" />

      {/* The open book: paper in both themes, two pages and a stitched spine on wide screens. */}
      <div className="grain relative z-10 grid rounded-[10px_26px_26px_10px] bg-paper text-on-paper shadow-lift ring-1 ring-on-paper/10 lg:grid-cols-[39%_minmax(0,1fr)] lg:rounded-[26px]">
        <aside aria-label="This week" className="relative border-b border-on-paper/10 px-6 py-6 sm:px-8 lg:border-b-0 lg:px-10 lg:py-10">
          <div className="lg:sticky lg:top-24">
            <p className="text-[0.5625rem] font-bold tracking-[0.24em] text-paper-muted uppercase">This week</p>
            <p className="mt-1 font-display text-xl leading-tight font-extrabold text-on-paper lg:text-2xl">
              At your table{" "}
              <span className="font-hand text-[1.35em] font-bold text-ocean-ink dark:text-ocean">so far</span>
            </p>
            {/* Phones: five numbers in a row. Wide screens: a row each, counted in tally marks. */}
            <dl className="mt-4 grid grid-cols-5 gap-2 lg:mt-6 lg:grid-cols-1 lg:gap-4">
              {TALLY_ROWS.map((row) => {
                const count = week?.[row.key];
                return (
                  <div key={row.key} className="flex flex-col-reverse lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)_auto] lg:items-center lg:gap-3">
                    <dt className="text-[0.625rem] font-semibold text-paper-muted lg:text-xs">{row.label}</dt>
                    <dd className={`hidden min-w-0 overflow-hidden lg:block ${row.ink}`}>
                      {count === undefined ? <span className="skeleton block h-4 w-20 rounded-full" /> : <TallyMarks count={count} />}
                    </dd>
                    <dd className="font-display text-xl font-extrabold text-on-paper tabular-nums lg:text-lg">
                      {count ?? <span className="skeleton block h-5 w-6 rounded-full lg:hidden" />}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {highlights?.loved && <MostLoved note={highlights.loved} />}
            {highlights && highlights.faces.length > 0 && <NewFaces faces={highlights.faces} />}
            <div className="mt-10 hidden rotate-[-1.2deg] border border-dashed border-on-paper/25 px-5 py-4 lg:block">
              <p className="font-hand text-2xl leading-none font-bold text-on-paper">Thanks for stopping by ♥</p>
              <p className="mt-2 text-xs leading-relaxed text-paper-muted">
                Likes are anonymous: you see how many, never who. Follows, comments and reposts are signed.
              </p>
            </div>
          </div>
          {/* The spine: a soft fold and its stitches. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -right-4 hidden w-8 bg-[linear-gradient(90deg,transparent,rgb(var(--shadow-rgb)/0.13)_50%,transparent)] lg:block"
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-8 right-0 hidden border-r-2 border-dotted border-on-paper/15 lg:block" />
        </aside>

        <section aria-label="Notifications" className="min-w-0 py-3 lg:py-5">
          {failed ? (
            <p className="px-8 py-16 text-center text-sm text-paper-muted">The book wouldn&apos;t open. Reload the page to try again.</p>
          ) : !shown ? (
            <NoteSkeleton rows={6} size="book" />
          ) : shown.items.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <svg aria-hidden viewBox="0 0 120 40" className="mx-auto h-8 w-28 text-paper-muted" fill="none">
                <path d="M6 30c18-14 30 6 46-6s28-10 40-2 18 2 22-4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="3 5" />
              </svg>
              <p className="mt-3 font-display font-bold text-on-paper">{EMPTY[show]}</p>
              <p className="mt-1 text-sm text-paper-muted">When it happens, it gets signed in here.</p>
            </div>
          ) : (
            <>
              <NoteList items={shown.items} owner={owner} size="book" />
              {shown.more && (
                <div className="px-6 pt-4 pb-3 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex h-10 items-center rounded-full border border-on-paper/20 px-5 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5 disabled:opacity-60"
                  >
                    {loadingMore ? "Turning the page…" : "Load earlier"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** The week's most liked piece, as a polaroid stamped with hearts in its own colors. */
function MostLoved({ note }: { note: AppNotification }) {
  const image = note.piece!.image!;
  return (
    <div className="mt-8 hidden lg:block">
      <p className="text-[0.5625rem] font-bold tracking-[0.24em] text-paper-muted uppercase">Most loved this week</p>
      <Link href={note.href} prefetch={false} className="group/loved mt-5 block w-fit">
        <figure className="relative w-52 rotate-[2.5deg] bg-white p-2.5 pb-11 shadow-[0_14px_28px_-14px_rgb(var(--shadow-rgb)/0.5),0_1px_3px_rgb(var(--shadow-rgb)/0.2)] transition-transform group-hover/loved:rotate-[1deg]">
          <Tape color={glowOf(image.palette ?? [], 1)[0]} className="-top-3.5 left-1/2 -translate-x-1/2 -rotate-3" />
          <Image src={image.src} alt={note.piece!.excerpt || "Your most liked piece this week"} width={image.width} height={image.height} sizes="188px" className="h-auto w-full" />
          <figcaption className="absolute inset-x-3 bottom-2 truncate font-hand text-xl leading-tight text-on-paper">
            {note.piece!.excerpt}
          </figcaption>
          <HeartStamps palette={image.palette} tally={Math.min(note.tally, 3)} className="absolute -right-7 -bottom-6 size-16 rotate-12" />
        </figure>
      </Link>
      <p className="mt-6 text-xs font-semibold text-paper-muted">
        {note.tally === 1 ? "1 new like" : `${note.tally} new likes`}
      </p>
    </div>
  );
}

/** Who started following this week, their pictures overlapping like signatures on a page. */
function NewFaces({ faces }: { faces: NoteActor[] }) {
  return (
    <div className="mt-8 hidden lg:block">
      <p className="text-[0.5625rem] font-bold tracking-[0.24em] text-paper-muted uppercase">New faces</p>
      <ul className="mt-3 flex -space-x-2.5">
        {faces.map((face, i) => (
          <li key={face.handle} style={{ rotate: `${(i % 3) * 4 - 4}deg` }}>
            <Link href={`/${face.handle}`} prefetch={false} title={face.name} className="block rounded-full transition-transform hover:-translate-y-1">
              <Avatar image={{ ...face.avatar, alt: face.name }} size={44} className="size-11 ring-[3px] ring-paper" />
            </Link>
          </li>
        ))}
      </ul>
      <p aria-hidden className="mt-1.5 font-hand text-xl text-ocean-ink dark:text-ocean">signed in this week</p>
    </div>
  );
}

/** The book while the viewer streams in. */
export function BookFallback() {
  return (
    <div className="grain relative mt-12 rounded-[10px_26px_26px_10px] bg-paper py-5 text-on-paper shadow-lift ring-1 ring-on-paper/10 lg:ml-[39%]">
      <NoteSkeleton rows={5} size="book" />
    </div>
  );
}

/** A closed book with a note on it (visitors). */
export function ClosedBook({ children }: { children: ReactNode }) {
  return (
    <div className="grain relative mt-12 grid min-h-80 place-items-center rounded-[10px_26px_26px_10px] bg-paper px-6 py-16 text-center text-on-paper shadow-lift ring-1 ring-on-paper/10">
      <div>{children}</div>
    </div>
  );
}
