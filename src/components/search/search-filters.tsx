import Link from "next/link";
import { CalendarDays, Check, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { SERVICE_CATEGORIES, STYLES, TURNAROUND_FILTERS } from "@/lib/listings/catalog";
import { SUBJECTS } from "@/lib/profile/draws";
import { searchHref, type SearchParams } from "@/lib/search/query";

/*
 * The sorting tray: every filter is a link to the same search with one thing
 * changed (works without JavaScript; the URL is the state). Price also takes
 * a typed range through a plain GET form.
 */

const PRICES = [
  { label: "Under $25", max: 25 },
  { label: "$25–50", min: 25, max: 50 },
  { label: "$50–100", min: 50, max: 100 },
  { label: "$100–200", min: 100, max: 200 },
  { label: "$200+", min: 200 },
];

const AVAILABILITY = {
  commissions: [
    { value: "open", label: "Open now", dot: "bg-mint-dot" },
    { value: "waitlist", label: "Open or waitlist", dot: "bg-lilac" },
    { value: "all", label: "Everything", dot: "bg-muted" },
  ],
  adoptables: [
    { value: "open", label: "Available", dot: "bg-mint-dot" },
    { value: "all", label: "Adopted ones too", dot: "bg-muted" },
  ],
  artists: [
    { value: "open", label: "Taking commissions", dot: "bg-mint-dot" },
    { value: "waitlist", label: "Open or waitlist", dot: "bg-lilac" },
    { value: "all", label: "Everyone", dot: "bg-muted" },
  ],
} as const;

const toggle = <T,>(list: readonly T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function Chip({ href, on, children, className = "" }: { href: string; on: boolean; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-current={on ? "true" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
        on ? "border-ink bg-ink text-on-ink" : "border-border bg-surface text-ink hover:border-ocean/40 hover:bg-ice/60"
      } ${className}`}
    >
      {on && <Check aria-hidden className="size-3.5" />}
      {children}
    </Link>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-dashed border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

export function SearchFilters({ params }: { params: SearchParams }) {
  const { type } = params;
  const priceOn = (p: (typeof PRICES)[number]) => params.minUsd === p.min && params.maxUsd === p.max;
  const customPrice = (params.minUsd !== undefined || params.maxUsd !== undefined) && !PRICES.some(priceOn);
  // Everything else in the URL rides along with the typed price range.
  const rest = new URLSearchParams(searchHref({ ...params, minUsd: undefined, maxUsd: undefined }).split("?")[1] ?? "");

  return (
    <div className="grid gap-4">
      <Section title={type === "adoptables" ? "Availability" : type === "artists" ? "Commissions" : "Slots"}>
        {AVAILABILITY[type].map((option) => (
          <Chip key={option.value} href={searchHref(params, { availability: option.value })} on={params.availability === option.value}>
            {params.availability !== option.value && <span aria-hidden className={`size-2 rounded-full ${option.dot}`} />}
            {option.label}
          </Chip>
        ))}
      </Section>

      <Section title="Price" icon={<Tag aria-hidden />}>
        {PRICES.map((p) => (
          <Chip
            key={p.label}
            href={searchHref(params, priceOn(p) ? { minUsd: undefined, maxUsd: undefined } : { minUsd: p.min, maxUsd: p.max })}
            on={priceOn(p)}
          >
            {p.label}
          </Chip>
        ))}
        <form action="/explore/search" className="mt-1 flex w-full items-center gap-1.5 text-sm text-muted">
          {[...rest.entries()].map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <label className="sr-only" htmlFor="price-min">Lowest price</label>
          <input
            id="price-min"
            name="min"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="$ min"
            defaultValue={customPrice ? params.minUsd : undefined}
            className="h-8 w-20 rounded-input border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-ocean"
          />
          –
          <label className="sr-only" htmlFor="price-max">Highest price</label>
          <input
            id="price-max"
            name="max"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="$ max"
            defaultValue={customPrice ? params.maxUsd : undefined}
            className="h-8 w-20 rounded-input border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-ocean"
          />
          <button type="submit" className="h-8 rounded-full bg-ice px-3 text-sm font-semibold text-ink hover:bg-ice-strong">
            Go
          </button>
        </form>
      </Section>

      {type !== "adoptables" && (
        <Section title="Turnaround" icon={<CalendarDays aria-hidden />}>
          {TURNAROUND_FILTERS.map((t) => (
            <Chip key={t.id} href={searchHref(params, { turnaround: params.turnaround === t.id ? undefined : t.id })} on={params.turnaround === t.id}>
              {t.label}
            </Chip>
          ))}
        </Section>
      )}

      {type !== "adoptables" && (
        <Section title="Category">
          {SERVICE_CATEGORIES.filter((c) => c.id !== "other").map((c) => (
            <Chip key={c.id} href={searchHref(params, { category: params.category === c.id ? undefined : c.id })} on={params.category === c.id}>
              {c.label}
            </Chip>
          ))}
        </Section>
      )}

      <Section title="Who they draw">
        {SUBJECTS.map((s) => (
          <Chip key={s.id} href={searchHref(params, { draws: toggle(params.draws, s.id) })} on={params.draws.includes(s.id)}>
            {s.label}
          </Chip>
        ))}
      </Section>

      {type !== "adoptables" && (
        <Section title="Style">
          {STYLES.map((s) => (
            <Chip key={s.id} href={searchHref(params, { styles: toggle(params.styles, s.id) })} on={params.styles.includes(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Section>
      )}
    </div>
  );
}
