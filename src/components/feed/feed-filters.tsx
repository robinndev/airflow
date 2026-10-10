import Link from "next/link";
import { Shapes } from "lucide-react";
import { Scribble } from "@/components/explore/doodles";
import type { PostKind } from "@/lib/profile/types";
import { STAGE_FILTERS, STAGES } from "./stages";

export type FeedTab = "for-you" | "following";

function feedHref(tab: FeedTab, stage: PostKind | null) {
  const params = new URLSearchParams();
  if (tab === "following") params.set("feed", "following");
  if (stage) params.set("stage", stage);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

/** Whose work (for you / following) and which stage of it (sketches, WIPs…). */
export function FeedFilters({ tab, stage }: { tab: FeedTab; stage: PostKind | null }) {
  const tabs: { key: FeedTab; label: string }[] = [
    { key: "for-you", label: "For you" },
    { key: "following", label: "Following" },
  ];
  const stages: { key: PostKind | null; label: string; icon: typeof Shapes }[] = [
    { key: null, label: "Everything", icon: Shapes },
    ...STAGE_FILTERS.map((key) => ({ key, label: STAGES[key].filter, icon: STAGES[key].icon })),
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <nav aria-label="Feed" className="flex items-baseline gap-6">
        {tabs.map(({ key, label }) => {
          const active = key === tab;
          return (
            <Link
              key={key}
              href={feedHref(key, stage)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative font-display text-[1.375rem] font-extrabold tracking-tight transition-colors ${
                active ? "text-ink" : "text-muted/70 hover:text-ink"
              }`}
            >
              {label}
              {active && <Scribble className="absolute -bottom-2.5 -left-[4%] w-[108%] text-ocean" />}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Stage"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0"
      >
        {stages.map(({ key, label, icon: Icon }) => {
          const active = key === stage;
          return (
            <Link
              key={label}
              href={feedHref(tab, key)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors [&_svg]:size-3.5 ${
                active
                  ? "border-ink bg-ink text-on-ink"
                  : "border-border bg-surface/60 text-ink backdrop-blur-sm hover:border-ink/30 hover:bg-surface"
              }`}
            >
              <Icon aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
