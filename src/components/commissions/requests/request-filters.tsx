import Link from "next/link";
import { SHOWS, type Show } from "@/lib/commissions/requests";

const DOT: Record<Show, string> = {
  all: "bg-ink",
  yours: "bg-lilac",
  waiting: "bg-muted",
  making: "bg-ocean",
  delivered: "bg-star",
  closed: "bg-like",
};

/** Which requests to show; lives in the URL (?show=), so every view is a link. */
export function RequestFilters({ show, counts }: { show: Show; counts: Record<Show, number> }) {
  return (
    <nav aria-label="Filter requests" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {SHOWS.map(({ id, label }) => {
        const active = id === show;
        const count = counts[id];
        return (
          <Link
            key={id}
            href={id === "all" ? "/requests" : `/requests?show=${id}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              active ? "border-ink bg-ink text-on-ink" : "border-border bg-surface text-ink hover:bg-ice"
            }`}
          >
            <span aria-hidden className={`size-2 rounded-full ${DOT[id]}`} />
            {label}
            <span
              className={`min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 font-bold tabular-nums ${
                id === "yours" && count > 0
                  ? "bg-lilac text-white"
                  : active
                    ? "bg-on-ink/15 text-on-ink"
                    : "bg-ink/[0.07] text-ink/70"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
