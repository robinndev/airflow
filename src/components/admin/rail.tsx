import Link from "next/link";
import { Check, Users } from "lucide-react";
import { formatClock } from "@/lib/admin/format";
import { adminHref, RANGES, RANGE_ORDER, type AdminQuery } from "@/lib/admin/range";

/**
 * The one row of controls above everything they scope: the period and
 * whether the team's own accounts count. Plain links; the URL is the state.
 */
export function AdminRail({ query, generatedAt }: { query: AdminQuery; generatedAt: string }) {
  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-border/70 bg-canvas/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Period">
          <ul className="flex w-max gap-1 rounded-full bg-ice p-1">
            {RANGE_ORDER.map((range) => {
              const current = range === query.range;
              return (
                <li key={range}>
                  <Link
                    href={adminHref(query, { range })}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-8 items-center rounded-full px-3 text-sm sm:px-3.5 font-semibold whitespace-nowrap transition-colors ${
                      current ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span className="sm:hidden" aria-hidden>
                      {RANGES[range].short}
                    </span>
                    <span className="max-sm:sr-only">{RANGES[range].label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href={adminHref(query, { withoutTeam: !query.withoutTeam })}
          scroll={false}
          title={query.withoutTeam ? "Our own accounts are left out" : "Leave our own accounts out"}
          className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-ocean/40"
        >
          <span
            aria-hidden
            className={`grid size-4 place-items-center rounded-[5px] border ${
              query.withoutTeam ? "border-muted/60" : "border-ocean bg-ocean text-white"
            }`}
          >
            {!query.withoutTeam && <Check className="size-3" strokeWidth={3} />}
          </span>
          <Users aria-hidden className="size-4 text-muted" />
          Count the team
          <span className="sr-only">{query.withoutTeam ? "(off)" : "(on)"}</span>
        </Link>

        <p className="ml-auto text-xs text-muted">
          Live · as of {formatClock(generatedAt)} · days in UTC
        </p>
      </div>
    </div>
  );
}
