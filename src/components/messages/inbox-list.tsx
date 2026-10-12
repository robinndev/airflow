"use client";

import { Search } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { HandNote } from "@/components/explore/doodles";
import type { InboxEntry } from "@/lib/messages/types";
import { inboxTime } from "@/lib/messages/time";
import { PostageStamp, Seal } from "./postage";
import { reloadInbox } from "./store";

type Tab = "all" | "unread" | "archived";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "archived", label: "Archived" },
];

const TILTS = [-3, -1.5, 1.5, 3, -2, 2];
const tiltFor = (handle: string) => TILTS[[...handle].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TILTS.length];

/**
 * Every conversation as a letter in the rack: their picture as a stamp, the
 * newest line, and a wax seal on the ones not opened yet. Used by the
 * header's dropdown and, on phones, by the chat window.
 */
export function InboxList({
  entries,
  failed,
  onOpen,
  activeHandle,
}: {
  entries: InboxEntry[] | null;
  failed: boolean;
  onOpen: (handle: string) => void;
  activeHandle?: string;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const unread = entries?.filter((e) => e.unread && !e.archived).length ?? 0;
  const needle = query.trim().toLowerCase().replace(/^@/, "");
  const visible = (entries ?? []).filter((e) => {
    if (tab === "archived" ? !e.archived : e.archived) return false;
    if (tab === "unread" && !e.unread) return false;
    if (!needle) return true;
    return [e.person.displayName, e.person.handle, e.last.body].some((text) => text.toLowerCase().includes(needle));
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-1">
        <label className="flex h-10 items-center gap-2 rounded-input border border-border bg-canvas/60 px-3 text-ink transition-colors focus-within:border-ocean focus-within:bg-surface">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <span className="sr-only">Search messages</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
        <div role="tablist" aria-label="Filter messages" className="mt-3 flex gap-1.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                tab === key ? "bg-ink text-on-ink" : "bg-ice text-ink hover:bg-ice-strong"
              }`}
            >
              {label}
              {key === "unread" && unread > 0 && (
                <span className={tab === key ? "text-on-ink/70" : "text-muted"}>{unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {failed ? (
          <div className="px-6 py-12 text-center">
            <p className="font-display font-bold text-ink">Couldn&apos;t load your messages</p>
            <button
              type="button"
              onClick={() => reloadInbox()}
              className="mt-2 text-sm font-semibold text-ocean-ink hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !entries ? (
          <div aria-busy aria-label="Loading messages" className="grid gap-1 px-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="h-[46px] w-10 skeleton rounded-[4px] bg-ice" />
                <div className="flex-1">
                  <div className="h-3 w-32 skeleton rounded-input bg-ice" />
                  <div className="mt-2 h-3 w-4/5 skeleton rounded-input bg-ice" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyRack />
        ) : visible.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            {needle
              ? `No one matches “${query.trim()}”.`
              : tab === "unread"
                ? "Nothing unread. You're all caught up."
                : tab === "archived"
                  ? "Nothing archived. Archived conversations come back when someone writes."
                  : "Everything's archived."}
          </p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-dashed divide-border">
            {visible.map((entry) => (
              <li key={entry.id}>
                <Letter entry={entry} active={entry.person.handle === activeHandle} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Letter({
  entry,
  active,
  onOpen,
}: {
  entry: InboxEntry;
  active: boolean;
  onOpen: (handle: string) => void;
}) {
  const { person, last, unread } = entry;
  return (
    <button
      type="button"
      onClick={() => onOpen(person.handle)}
      aria-current={active || undefined}
      style={{ "--tint": person.tint } as CSSProperties}
      className={`my-0.5 flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-ice/70 ${
        active ? "bg-ice/80" : unread ? "bg-ice/40" : ""
      }`}
    >
      <PostageStamp image={person.avatar} size={40} tilt={tiltFor(person.handle)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className={`truncate text-sm text-ink ${unread ? "font-bold" : "font-semibold"}`}>{person.displayName}</span>
          <span className="min-w-0 truncate text-xs text-muted">@{person.handle}</span>
          <span className="ml-auto shrink-0 pl-2 text-xs text-muted">{inboxTime(last.at)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={`min-w-0 truncate text-[0.8125rem] ${unread ? "font-medium text-ink" : "text-muted"}`}>
            {last.fromMe && <span className="text-muted">You: </span>}
            {last.body}
          </span>
          {unread && (
            <>
              <Seal className="ml-auto size-5" />
              <span className="sr-only">Unread</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/** No conversations yet: an empty envelope and where letters come from. */
function EmptyRack() {
  return (
    <div className="flex flex-col items-center px-6 pt-8 pb-10 text-center">
      <svg aria-hidden viewBox="0 0 120 84" className="w-32 text-muted/70">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <rect x="6" y="14" width="104" height="64" rx="5" className="fill-surface" />
          <path d="M8 18l50 34 50-34" />
          <path d="M8 76l38-28M108 76L70 48" strokeOpacity=".5" />
        </g>
        <g transform="rotate(8 94 18)">
          <rect x="82" y="4" width="24" height="28" rx="2" className="fill-ocean/15 stroke-ocean" strokeWidth="1.5" strokeDasharray="2.5 2" />
          <path d="M88 22c3-6 8-6 12 0" className="stroke-ocean" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="94" cy="13" r="2.5" className="fill-ocean" />
        </g>
      </svg>
      <HandNote className="mt-3 -rotate-2">no letters yet…</HandNote>
      <p className="mt-2 max-w-64 text-sm text-muted">
        Message an artist from their profile to ask about a commission, a slot, or a piece you loved.
      </p>
    </div>
  );
}
