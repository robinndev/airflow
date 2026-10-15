"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { loadFollowList } from "@/app/(site)/social-actions";
import { useSocialViewer } from "@/components/social/store";
import { buttonClasses } from "@/components/ui/button";
import {
  FOLLOW_PAGE,
  FOLLOW_QUERY_MAX,
  cleanFollowQuery,
  emptyNote,
  marksFollowsYou,
  mutualFilterLabel,
  type FollowList,
  type FollowPage,
  type FollowPerson,
} from "@/lib/follows/list";
import { formatCompact } from "@/lib/format";
import { PersonCard } from "./person-card";

/*
 * The binder's pages: everyone on the list as trading cards in sleeves,
 * newest follow first. Cards stay put once they're on the page, so
 * unfollowing someone never makes them vanish (the toast has Undo). Above
 * the sleeves: "Also follow you" (the people on this list who follow the
 * viewer too) and a search once the list runs past a page.
 */

type View = FollowPage & { loading: boolean };

const EMPTY: View = { people: [], total: 0, loading: true };

export function FollowBinder({
  handle,
  list,
  ownerId,
  name,
  initial,
  sample,
}: {
  handle: string;
  list: FollowList;
  ownerId: string;
  /** The owner's first name, for the empty page. */
  name: string;
  initial: FollowPage;
  /** A demo artist's made-up followers beyond the real ones. */
  sample: number;
}) {
  const viewer = useSocialViewer();
  const own = viewer === ownerId;
  const mutualLabel = viewer ? mutualFilterLabel(list, own) : null;

  // The plain list keeps everything loaded so far (switching filters and back costs nothing).
  const [all, setAll] = useState<View>({ ...initial, loading: false });
  const [mutual, setMutual] = useState<View | null>(null);
  const [showMutual, setShowMutual] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<View | null>(null);
  const latest = useRef(0);

  const words = cleanFollowQuery(query);
  const view = words ? (found ?? EMPTY) : showMutual && mutual ? mutual : all;
  const filtered = Boolean(words) || showMutual;

  // Who on this list also follows the viewer: counted as soon as the viewer is known.
  useEffect(() => {
    setMutual(null);
    setShowMutual(false);
    if (!viewer || !mutualFilterLabel(list, viewer === ownerId)) return;
    let live = true;
    loadFollowList(handle, list, { mutual: true })
      .then((page) => live && setMutual({ ...page, loading: false }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [viewer, handle, list, ownerId]);

  // Searching: a moment after typing stops, through the whole list (or the mutual part of it).
  useEffect(() => {
    if (!words) return setFound(null);
    const id = ++latest.current;
    setFound((current) => (current ? { ...current, loading: true } : null));
    const timer = setTimeout(() => {
      loadFollowList(handle, list, { query: words, mutual: showMutual })
        .then((page) => latest.current === id && setFound({ ...page, loading: false }))
        .catch(() => latest.current === id && setFound({ people: [], total: 0, loading: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [words, showMutual, handle, list]);

  async function more() {
    // The view the button was on, even if the filter changes while the page loads.
    const searching = words;
    const onlyMutual = showMutual;
    const patch = (change: (current: View) => View) => {
      if (searching) setFound((current) => current && change(current));
      else if (onlyMutual) setMutual((current) => current && change(current));
      else setAll(change);
    };
    patch((current) => ({ ...current, loading: true }));
    const page = await loadFollowList(handle, list, { offset: view.people.length, query: searching, mutual: onlyMutual }).catch(() => null);
    patch((current) => {
      if (!page) return { ...current, loading: false };
      const seen = new Set(current.people.map((p) => p.handle));
      return { people: [...current.people, ...page.people.filter((p) => !seen.has(p.handle))], total: page.total, loading: false };
    });
  }

  const filters = Boolean(mutualLabel && mutual && mutual.total > 0);
  const searchable = all.total > FOLLOW_PAGE || Boolean(query);
  const left = view.total - view.people.length;
  // Everyone on a filtered view follows the viewer; so does everyone on your own followers list.
  const followsYouKnown = showMutual || (own && list === "followers") ? true : undefined;

  if (all.total === 0) return <EmptyPage list={list} own={own} viewerKnown={viewer !== undefined} name={name} sample={sample} />;

  return (
    <div>
      {(filters || searchable) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
            {filters && mutual && (
              <>
                <FilterChip pressed={!showMutual} onClick={() => setShowMutual(false)}>
                  Everyone
                  <span className="tabular-nums opacity-70">{formatCompact(all.total)}</span>
                </FilterChip>
                <FilterChip pressed={showMutual} onClick={() => setShowMutual(true)}>
                  <Faces people={mutual.people} />
                  {mutualLabel}
                  <span className="tabular-nums opacity-70">{formatCompact(mutual.total)}</span>
                </FilterChip>
              </>
            )}
          </div>
          {searchable && (
            <label className="relative flex w-full items-center sm:w-64">
              <span className="sr-only">Find someone on this list</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-muted" />
              <input
                type="search"
                value={query}
                maxLength={FOLLOW_QUERY_MAX}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find someone"
                className="h-10 w-full rounded-input border border-border bg-surface pr-9 pl-9 text-sm text-ink placeholder:text-muted focus:border-ocean focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear the search"
                  className="absolute right-1.5 grid size-7 place-items-center rounded-full text-muted hover:bg-ice hover:text-ink"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </label>
          )}
        </div>
      )}

      <div aria-busy={view.loading} className={`px-4 pt-4 pb-5 transition-opacity sm:px-6 ${view.loading && view.people.length === 0 ? "opacity-60" : ""}`}>
        {view.people.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {view.people.map((person, index) => (
              <Sleeve key={person.handle}>
                <PersonCard
                  person={person}
                  viewer={viewer}
                  number={filtered ? undefined : all.total - index}
                  followsYouKnown={followsYouKnown}
                  markFollowsYou={marksFollowsYou(list, own)}
                />
              </Sleeve>
            ))}
          </ul>
        ) : (
          <p role="status" className="py-10 text-center text-sm text-muted">
            {view.loading ? "Looking…" : words ? <>No one called &ldquo;{words}&rdquo; here.</> : "No one yet."}
          </p>
        )}

        {left > 0 && view.people.length > 0 && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <button type="button" onClick={more} disabled={view.loading} className={buttonClasses({ variant: "secondary" })}>
              {view.loading ? "Turning the page…" : `Show ${Math.min(left, FOLLOW_PAGE)} more`}
            </button>
            <p className="text-xs text-muted tabular-nums">
              {view.people.length} of {formatCompact(view.total)}
            </p>
          </div>
        )}

        {!filtered && sample > 0 && left <= 0 && <SampleNote list={list} name={name} sample={sample} />}
      </div>
    </div>
  );
}

/** A clear plastic pocket on the binder page; its open edge catches the light. */
function Sleeve({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative rounded-[18px] bg-ice/55 p-1.5 ring-1 ring-border/80 dark:bg-ice/30">
      <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-surface to-transparent" />
      {children}
    </li>
  );
}

function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-ink transition-colors hover:border-sky/60 aria-pressed:border-transparent aria-pressed:bg-ink aria-pressed:text-on-ink"
    >
      {children}
    </button>
  );
}

/** The first few faces of a group, overlapping. */
function Faces({ people }: { people: FollowPerson[] }) {
  return (
    <span aria-hidden className="-ml-1.5 flex -space-x-2">
      {people.slice(0, 3).map((person) => (
        <Image
          key={person.handle}
          src={person.avatar.src}
          alt=""
          width={24}
          height={24}
          className="size-6 rounded-full bg-ice object-cover ring-2 ring-surface"
        />
      ))}
    </span>
  );
}

function EmptyPage({
  list,
  own,
  viewerKnown,
  name,
  sample,
}: {
  list: FollowList;
  own: boolean;
  viewerKnown: boolean;
  name: string;
  sample: number;
}) {
  const note = emptyNote(list, { own, name });
  return (
    <div className="px-4 py-8 sm:px-6">
      {/* Three empty sleeves, waiting. */}
      <ul aria-hidden className="mx-auto grid max-w-md grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="aspect-[5/7] rounded-[18px] border-2 border-dashed border-border bg-ice/40" />
        ))}
      </ul>
      <div className="mt-6 text-center">
        <p className="font-display text-lg font-bold text-ink">{sample > 0 ? `${name} is a demo artist` : note.title}</p>
        {/* Says something different to the owner, so it waits until we know who's looking. */}
        <p className={`mx-auto mt-1 max-w-sm text-sm text-muted transition-opacity ${viewerKnown ? "" : "opacity-0"}`}>
          {sample === 0
            ? note.body
            : list === "followers"
              ? `Their ${formatCompact(sample)} followers are sample numbers. Follow them and you'll be the first one here.`
              : `The ${formatCompact(sample)} artists they follow are sample numbers: demo artists don't follow anyone for real.`}
        </p>
        {viewerKnown && own && list === "following" && (
          <Link href="/explore" className={buttonClasses({ size: "sm", className: "mt-4" })}>
            Explore the wall
          </Link>
        )}
      </div>
    </div>
  );
}

function SampleNote({ list, name, sample }: { list: FollowList; name: string; sample: number }) {
  return (
    <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted">
      {name} is one of Artiflow&rsquo;s demo artists: the other {formatCompact(sample)} {list} on the count are sample numbers.
    </p>
  );
}
