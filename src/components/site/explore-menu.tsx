"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brush,
  ChevronDown,
  Clock,
  Compass,
  Earth,
  Flame,
  Rss,
  Search,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { HeaderMenu } from "./header-menu";

type ExploreItem = { href: string; label: string; hint: string; icon: LucideIcon };

const SECTIONS: { title: string; items: ExploreItem[] }[] = [
  {
    title: "Discover",
    items: [
      { href: "/explore/popular", label: "Trending", hint: "Most liked this week", icon: Flame },
      { href: "/?feed=following", label: "Feed", hint: "From artists you follow", icon: Rss },
      { href: "/explore/recent", label: "Recent", hint: "Newest listings", icon: Clock },
      { href: "/explore/search?type=artists", label: "Artists", hint: "By name, style and price", icon: Search },
    ],
  },
  {
    title: "Shop",
    items: [
      { href: "/explore/commissions", label: "Open commissions", hint: "Made to order", icon: Brush },
      { href: "/explore/adoptables", label: "Adoptables", hint: "Ready-made characters", icon: Tag },
      { href: "/explore/literatures", label: "Literatures", hint: "Stories and lore", icon: BookOpen },
      { href: "/explore/worlds", label: "Worlds", hint: "Shared universes", icon: Earth },
    ],
  },
];

export function ExploreMenu() {
  const router = useRouter();
  return (
    <HeaderMenu
      label="Explore"
      panelClassName="sm:w-[26rem]"
      triggerClassName="group/trigger flex h-10 items-center gap-2 rounded-full bg-surface/75 px-3 text-sm font-semibold text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice sm:px-4"
      trigger={
        <>
          <Compass aria-hidden className="size-[1.125rem]" />
          <span className="hidden sm:inline">Explore</span>
          <ChevronDown
            aria-hidden
            className="hidden size-4 text-muted transition-transform duration-200 group-aria-expanded/trigger:rotate-180 sm:block"
          />
        </>
      }
    >
      <div className="rounded-[20px] border border-border bg-surface p-3 shadow-lift">
        <form
          role="search"
          action="/explore/search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(q ? `/explore/search?q=${encodeURIComponent(q)}` : "/explore/search");
          }}
          className="relative"
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            name="q"
            aria-label="Search Artiflow"
            placeholder="Search commissions, adoptables, artists…"
            className="h-11 w-full rounded-input border border-border bg-canvas pr-3 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-muted/80 focus:border-ocean focus:bg-surface"
          />
        </form>

        <Link
          href="/explore"
          className="mt-3 flex items-center justify-between rounded-[12px] bg-gradient-to-r from-ice to-ice-lilac px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-[0.98]"
        >
          Explore everything
          <ArrowRight aria-hidden className="size-4 text-accent-strong" />
        </Link>

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
                      className="group/item flex items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors hover:bg-ice"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-ice text-accent-strong transition-colors group-hover/item:bg-surface">
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
    </HeaderMenu>
  );
}
