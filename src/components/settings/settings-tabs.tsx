"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Bell, Eye, KeyRound, Palette, type LucideIcon } from "lucide-react";

/*
 * The binder's index tabs. On wide screens they stand down the side of the
 * sheet, the open one a page of white paper; on phones they sit along its
 * top edge and scroll sideways.
 */

type Tab = { href: string; label: string; hint: string; icon: LucideIcon; chip: string };

const TABS: Tab[] = [
  { href: "/settings", label: "Account", hint: "Email, password, ways in", icon: KeyRound, chip: "bg-ocean/10 text-ocean" },
  { href: "/settings/notifications", label: "Notifications", hint: "Guest book, message alerts", icon: Bell, chip: "bg-sky/12 text-sky-ink dark:text-sky" },
  { href: "/settings/privacy", label: "Privacy", hint: "Likes, local time, who sees what", icon: Eye, chip: "bg-lilac/12 text-lilac-ink dark:text-lilac" },
  { href: "/settings/appearance", label: "Appearance", hint: "Theme and wall size", icon: Palette, chip: "bg-mint/12 text-mint-ink dark:text-mint" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // Phones: the tabs scroll sideways, so bring the open one into view.
  useEffect(() => {
    const strip = nav.current;
    const open = strip?.querySelector<HTMLElement>("[aria-current=page]");
    if (strip && open && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = open.offsetLeft - 16;
  }, [pathname]);

  return (
    <nav ref={nav} aria-label="Settings" className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
      <ul className="flex gap-1.5 lg:flex-col lg:gap-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-3 rounded-t-[14px] border border-b-0 border-transparent px-3 pt-2.5 pb-2 text-ink transition-[background-color,border-color,box-shadow] duration-200 hover:bg-ice/70 aria-[current=page]:border-border aria-[current=page]:bg-surface aria-[current=page]:shadow-soft lg:rounded-[14px] lg:border-b lg:py-2.5"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] [&_svg]:size-4 ${tab.chip}`}>
                  <Icon aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="hidden truncate text-xs text-muted lg:block">{tab.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
