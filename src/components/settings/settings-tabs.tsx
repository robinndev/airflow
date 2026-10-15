"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Eye, KeyRound, Palette, type LucideIcon } from "lucide-react";

/*
 * The binder's index tabs. On wide screens they stand down the side of the
 * sheet, the open one pulled out toward it; on phones they sit along its top
 * edge and scroll sideways.
 */

type Tab = { href: string; label: string; hint: string; icon: LucideIcon; edge: string; ink: string };

const TABS: Tab[] = [
  { href: "/settings", label: "Account", hint: "Email, password, ways in", icon: KeyRound, edge: "before:bg-ocean", ink: "text-ocean" },
  { href: "/settings/notifications", label: "Notifications", hint: "Guest book, message alerts", icon: Bell, edge: "before:bg-sky", ink: "text-sky-ink dark:text-sky" },
  { href: "/settings/privacy", label: "Privacy", hint: "Likes, local time, who sees what", icon: Eye, edge: "before:bg-lilac", ink: "text-lilac-ink dark:text-lilac" },
  { href: "/settings/appearance", label: "Appearance", hint: "Theme and wall size", icon: Palette, edge: "before:bg-mint", ink: "text-mint-ink dark:text-mint" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
      <ul className="flex gap-1.5 lg:flex-col lg:gap-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`group/tab relative flex items-center gap-2.5 overflow-hidden rounded-t-[12px] border border-b-0 border-border bg-ice/60 px-3.5 pt-3 pb-2.5 text-ink transition-[background-color,translate,box-shadow] duration-200 before:absolute before:inset-x-0 before:top-0 before:h-1 hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:shadow-soft lg:rounded-l-[6px] lg:rounded-r-[14px] lg:border-b lg:py-3 lg:pr-4 lg:pl-5 lg:before:inset-y-0 lg:before:right-auto lg:before:h-auto lg:before:w-1.5 lg:hover:translate-x-1 lg:aria-[current=page]:translate-x-3 ${tab.edge}`}
              >
                <Icon aria-hidden className={`size-[1.125rem] shrink-0 ${tab.ink}`} />
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
