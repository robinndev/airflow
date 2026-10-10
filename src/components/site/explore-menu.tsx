"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Clock,
  Compass,
  Earth,
  Flame,
  Rss,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type ExploreItem = { href: string; label: string; hint: string; icon: LucideIcon };

const SECTIONS: { title: string; items: ExploreItem[] }[] = [
  {
    title: "Characters",
    items: [
      { href: "/explore/popular", label: "Popular", hint: "Trending this week", icon: Flame },
      { href: "/explore/feed", label: "Feed", hint: "From artists you follow", icon: Rss },
      { href: "/explore/recent", label: "Recent", hint: "Freshly uploaded", icon: Clock },
      { href: "/explore/search", label: "Search", hint: "Filter by tags & traits", icon: Search },
    ],
  },
  {
    title: "Browse",
    items: [
      { href: "/explore/literatures", label: "Literatures", hint: "Stories and lore", icon: BookOpen },
      { href: "/explore/worlds", label: "Worlds", hint: "Shared universes", icon: Earth },
    ],
  },
];

const CLOSE_DELAY_MS = 140;

/**
 * Opens on hover for mouse users (with a short close delay so the pointer can
 * travel into the panel), on click/tap for everyone else, and supports Esc
 * and outside clicks. The panel stays mounted but `inert` while closed.
 */
export function ExploreMenu() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef<string>("");
  const [open, setOpen] = useState(false);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Explore"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        // Hover already opened it for mouse users, so a click must not close it.
        onClick={() => {
          if (lastPointer.current === "mouse") show();
          else setOpen((o) => !o);
          lastPointer.current = "";
        }}
        className="flex h-10 items-center gap-2 rounded-full bg-white/75 px-3 text-sm font-semibold text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-white aria-expanded:bg-white group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice sm:px-4"
      >
        <Compass aria-hidden className="size-[1.125rem]" />
        <span className="hidden sm:inline">Explore</span>
        <ChevronDown
          aria-hidden
          className={`hidden size-4 text-muted transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* pt-2 is an invisible hover bridge between the button and the panel. */}
      <div
        id={panelId}
        inert={!open}
        data-open={open}
        className="fixed inset-x-4 top-16 z-50 pt-2 opacity-0 transition-[opacity,translate] duration-150 data-[open=false]:pointer-events-none data-[open=false]:-translate-y-1 data-[open=true]:opacity-100 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-[26rem]"
      >
        <div className="rounded-[20px] border border-border bg-white p-3 shadow-lift">
          <form
            role="search"
            // The /search route lands with discovery; keep the field inert for now.
            onSubmit={(e) => e.preventDefault()}
            className="relative"
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              aria-label="Search characters, artists and worlds"
              placeholder="Search characters, artists, worlds…"
              className="h-11 w-full rounded-input border border-border bg-canvas pr-3 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-muted/80 focus:border-ocean focus:bg-white"
            />
          </form>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-2">
            {SECTIONS.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <p className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase">
                  {section.title}
                </p>
                <ul>
                  {section.items.map(({ href, label, hint, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        prefetch={false}
                        onClick={() => setOpen(false)}
                        className="group/item flex items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors hover:bg-ice"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-ice text-accent-strong transition-colors group-hover/item:bg-white">
                          <Icon aria-hidden className="size-[1.125rem]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{label}</span>
                          <span className="block truncate text-xs text-muted">{hint}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
