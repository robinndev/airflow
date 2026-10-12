"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Brush, Clock, Hash, Search, TrendingUp, X } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { formatUsd } from "@/lib/format";
import type { SearchIndex } from "@/lib/explore";

type Option =
  | { kind: "query"; id: string; label: string; href: string }
  | { kind: "category"; id: string; label: string; href: string }
  | { kind: "artist"; id: string; label: string; href: string; item: SearchIndex["artists"][number] }
  | { kind: "service"; id: string; label: string; href: string; item: SearchIndex["services"][number] }
  | { kind: "tag"; id: string; label: string; href: string };

const RECENT_KEY = "artiflow:recent-searches";
const searchHref = (q: string) => `/explore/search?q=${encodeURIComponent(q)}`;

/** Ranks prefix matches (of any word) above substring matches; drops non-matches. */
function rank<T>(items: T[], text: (item: T) => string, q: string, limit: number) {
  return items
    .map((item) => {
      const value = text(item).toLowerCase();
      const score = value.startsWith(q) ? 0 : value.split(/[\s@._-]+/).some((w) => w.startsWith(q)) ? 1 : value.includes(q) ? 2 : 3;
      return { item, score };
    })
    .filter((r) => r.score < 3)
    .toSorted((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.item);
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Explore search with instant, client-side autocomplete over a small cached
 * index (categories, artists, services, tags). Implements the WAI-ARIA
 * combobox pattern: arrows move, Enter opens, Esc closes.
 */
export function ExploreSearch({
  index,
  popular,
  initialValue = "",
  compact = false,
}: {
  index: SearchIndex;
  popular: string[];
  /** The search being shown (the search page keeps it in the box). */
  initialValue?: string;
  /** A slimmer box, for the search page's header. */
  compact?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const query = useDeferredValue(value.trim().toLowerCase());

  const groups = useMemo(() => {
    if (!query) return null;
    const categories = rank(index.categories, (c) => c.label, query, 3).map(
      (c): Option => ({ kind: "category", id: `cat-${c.slug}`, label: c.label, href: c.href }),
    );
    const artists = rank(index.artists, (a) => `${a.displayName} @${a.handle}`, query, 4).map(
      (a): Option => ({ kind: "artist", id: `artist-${a.handle}`, label: a.displayName, href: a.href, item: a }),
    );
    const services = rank(index.services, (s) => s.title, query, 3).map(
      (s): Option => ({
        kind: "service",
        id: `svc-${s.id}`,
        label: s.title,
        href: s.href,
        item: s,
      }),
    );
    const tags = rank(index.tags, (t) => t, query, 4).map(
      (t): Option => ({ kind: "tag", id: `tag-${t}`, label: t, href: searchHref(`#${t}`) }),
    );
    return { categories, artists, services, tags };
  }, [index, query]);

  // Flat list in visual order — what the arrow keys walk through.
  const options: Option[] = useMemo(() => {
    if (!groups) {
      return [...recent, ...popular].map(
        (q, i): Option => ({ kind: "query", id: `q-${i}`, label: q, href: searchHref(q) }),
      );
    }
    return [
      { kind: "query", id: "q-current", label: value.trim(), href: searchHref(value.trim()) },
      ...groups.categories,
      ...groups.services,
      ...groups.artists,
      ...groups.tags,
    ];
  }, [groups, popular, recent, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function go(option: Option) {
    if (option.kind === "query" || option.kind === "tag" || option.kind === "category") {
      const next = [option.label, ...readRecent().filter((r) => r !== option.label)].slice(0, 4);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
    }
    setOpen(false);
    router.push(option.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (options.length ? (i + delta + options.length) % options.length : -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = options[active] ?? (value.trim() ? options[0] : undefined);
      if (chosen) go(chosen);
    } else if (event.key === "Escape") {
      if (open) setOpen(false);
      else setValue("");
    }
  }

  const optionProps = (option: Option) => {
    const i = options.indexOf(option);
    return {
      id: `${listId}-${option.id}`,
      active: i === active,
      onHover: () => setActive(i),
      onSelect: () => go(option),
    };
  };

  const showPanel = open && options.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search services, tags or artists"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && options[active] ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Artists, styles, tags…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`w-full border border-border bg-surface pr-24 pl-13 text-base text-ink shadow-lift outline-none transition-[border-color,box-shadow,border-radius] placeholder:text-muted/80 focus:border-ocean [&::-webkit-search-cancel-button]:hidden ${compact ? "h-13" : "h-14 sm:h-16 sm:text-lg"} ${
            showPanel ? "rounded-t-[28px] rounded-b-none" : "rounded-full"
          }`}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-14 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink sm:right-16"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Search"
          onClick={() => (value.trim() ? go(options[0]) : inputRef.current?.focus())}
          className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-accent text-on-accent transition hover:brightness-95 sm:size-12"
        >
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!showPanel}
        className="absolute inset-x-0 top-full z-30 max-h-[min(32rem,70dvh)] overflow-y-auto overscroll-contain rounded-b-[28px] border border-t-0 border-border bg-surface p-2 pt-0 shadow-lift"
      >
        <div className="mx-3 border-t border-border" />

        {!groups ? (
          <>
            {recent.length > 0 && (
              <Group title="Recent">
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {options
                    .filter((o) => o.kind === "query" && recent.includes(o.label))
                    .map((o) => (
                      <ChipOption key={o.id} {...optionProps(o)} icon={<Clock aria-hidden />}>
                        {o.label}
                      </ChipOption>
                    ))}
                </div>
              </Group>
            )}
            <Group title="Popular right now">
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {options
                  .filter((o) => o.kind === "query" && !recent.includes(o.label))
                  .map((o) => (
                    <ChipOption key={o.id} {...optionProps(o)} icon={<TrendingUp aria-hidden />}>
                      {o.label}
                    </ChipOption>
                  ))}
              </div>
            </Group>
          </>
        ) : (
          <>
            {groups.categories.length > 0 && (
              <Group title="I want to commission…">
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {groups.categories.map((o) => (
                    <ChipOption key={o.id} {...optionProps(o)} icon={<Brush aria-hidden />}>
                      <span>
                        <Highlight text={o.label} query={query} />
                      </span>
                    </ChipOption>
                  ))}
                </div>
              </Group>
            )}

            <Row {...optionProps(options[0])} leading={<IconBubble><Search aria-hidden /></IconBubble>}>
              Search for <span className="font-semibold text-ink">“{value.trim()}”</span>
            </Row>

            {groups.services.length > 0 && (
              <Group title="Services">
                {groups.services.map((o) =>
                  o.kind === "service" ? (
                    <Row
                      key={o.id}
                      {...optionProps(o)}
                      leading={
                        o.item.cover ? (
                          <Image
                            src={o.item.cover.src}
                            alt=""
                            width={44}
                            height={44}
                            className="size-11 rounded-[12px] bg-ice object-cover"
                            style={{ objectPosition: o.item.cover.focus ?? "50% 25%" }}
                          />
                        ) : (
                          <IconBubble><Brush aria-hidden /></IconBubble>
                        )
                      }
                      trailing={<span className="text-sm font-semibold text-ink">from {formatUsd(o.item.priceFromUsd)}</span>}
                    >
                      <span className="block font-semibold text-ink">
                        <Highlight text={o.label} query={query} />
                      </span>
                      <span className="block text-xs text-muted">by @{o.item.ownerHandle}</span>
                    </Row>
                  ) : null,
                )}
              </Group>
            )}

            {groups.artists.length > 0 && (
              <Group title="Artists">
                {groups.artists.map((o) =>
                  o.kind === "artist" ? (
                    <Row
                      key={o.id}
                      {...optionProps(o)}
                      leading={
                        <Image
                          src={o.item.avatar.src}
                          alt=""
                          width={44}
                          height={44}
                          className="size-11 rounded-full bg-ice object-cover"
                          style={{ objectPosition: o.item.avatar.focus }}
                        />
                      }
                      trailing={<ArrowUpRight aria-hidden className="size-4 text-muted" />}
                    >
                      <span className="block font-semibold text-ink">
                        <Highlight text={o.item.displayName} query={query} />{" "}
                        <span className="font-normal text-muted">
                          @<Highlight text={o.item.handle} query={query} />
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted">{o.item.headline}</span>
                    </Row>
                  ) : null,
                )}
              </Group>
            )}

            {groups.tags.length > 0 && (
              <Group title="Tags">
                {groups.tags.map((o) => (
                  <Row key={o.id} {...optionProps(o)} leading={<IconBubble><Hash aria-hidden /></IconBubble>}>
                    <span className="font-semibold text-ink">
                      <Highlight text={o.label} query={query} />
                    </span>
                  </Row>
                ))}
              </Group>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="pt-3">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted">{title}</p>
      {children}
    </div>
  );
}

type OptionProps = { id: string; active: boolean; onHover: () => void; onSelect: () => void };

function Row({
  id,
  active,
  onHover,
  onSelect,
  leading,
  trailing,
  children,
}: OptionProps & { leading: ReactNode; trailing?: ReactNode; children: ReactNode }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onPointerMove={onHover}
      // pointerdown keeps focus in the input; click selects.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-3 rounded-[16px] px-3 py-2 text-sm text-ink/80 transition-colors ${
        active ? "bg-ice" : ""
      }`}
    >
      <span className="shrink-0">{leading}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </div>
  );
}

function ChipOption({ id, active, onHover, onSelect, icon, children }: OptionProps & { icon: ReactNode; children: ReactNode }) {
  return (
    <span
      id={id}
      role="option"
      aria-selected={active}
      onPointerMove={onHover}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium text-ink transition-colors [&_svg]:size-3.5 [&_svg]:text-muted ${
        active ? "border-ocean bg-ice" : "border-border hover:bg-ice"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-11 place-items-center rounded-full bg-ice text-muted [&_svg]:size-[1.125rem]">
      {children}
    </span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query);
  if (!query || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-sky/25 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}
