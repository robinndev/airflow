"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sign-in", label: "Sign in", dot: "bg-ocean" },
  { href: "/join", label: "Create account", dot: "bg-lilac" },
] as const;

/** Binder index tabs sticking out of the sheet's top edge. */
export function SheetTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="absolute top-0 left-4 z-20 flex h-10 items-end gap-1 sm:left-6">
      {TABS.map((tab) => {
        const current = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`flex items-center gap-2 rounded-t-[14px] px-4 font-display text-sm font-bold transition-[height,background-color,color] duration-200 ${
              current
                ? "h-10 bg-surface text-ink shadow-[0_-6px_14px_-6px_rgb(var(--shadow-rgb)/0.18)]"
                : "h-8 bg-ice/85 text-muted backdrop-blur-sm hover:h-9 hover:text-ink"
            }`}
          >
            <span aria-hidden className={`size-2 rounded-full ${tab.dot} ${current ? "" : "opacity-60"}`} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
