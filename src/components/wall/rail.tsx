import Link from "next/link";
import { Check, Dices, X } from "lucide-react";
import type { ReactNode } from "react";
import { MOODS } from "@/lib/palette";
import { wallHref, type WallParams, type WallShow, type WallSort } from "@/lib/wall/query";
import { TileSize } from "./tile-size";

/*
 * The wall's controls, under the header while you scroll: what to show (with
 * counts), artists taking commissions, palette (paint dabs), order, tile
 * size. Every control is a link to the same wall with one thing changed:
 * works without JavaScript, and the URL is the state.
 */

const SHOWS: { show: WallShow; label: string }[] = [
  { show: "all", label: "Everything" },
  { show: "art", label: "Art" },
  { show: "characters", label: "Characters" },
  { show: "adoptables", label: "Adoptables" },
];

const SORTS: { sort: Exclude<WallSort, "shuffle">; label: string }[] = [
  { sort: "mix", label: "Mix" },
  { sort: "trending", label: "Trending" },
  { sort: "new", label: "Newest" },
];

/** Each dab's own shape, so the row reads as paint, not as buttons. */
const DAB_SHAPES = [
  "58% 42% 55% 45% / 47% 56% 44% 53%",
  "45% 55% 42% 58% / 55% 44% 56% 45%",
  "52% 48% 60% 40% / 42% 58% 42% 58%",
  "40% 60% 48% 52% / 60% 40% 55% 45%",
  "55% 45% 40% 60% / 50% 52% 48% 50%",
  "48% 52% 57% 43% / 45% 50% 50% 55%",
];

const linkProps = { scroll: false, prefetch: false } as const;

function Rule() {
  return <span aria-hidden className="h-6 w-px shrink-0 bg-border" />;
}

export function WallRail({ params, counts }: { params: WallParams; counts: Record<WallShow, number> }) {
  return (
    <div className="sticky top-16 z-30 border-b border-border/70 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:px-6">
        <nav aria-label="Show" className="flex shrink-0 gap-1">
          {SHOWS.map(({ show, label }) => {
            const on = params.show === show;
            return (
              <Link
                key={show}
                href={wallHref(params, { show })}
                {...linkProps}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  on ? "bg-ink text-on-ink" : "text-muted hover:bg-ice hover:text-ink"
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-on-ink/15" : "bg-ice"}`}>{counts[show]}</span>
              </Link>
            );
          })}
        </nav>

        <Rule />

        <Link
          href={wallHref(params, { open: !params.open })}
          {...linkProps}
          aria-current={params.open ? "true" : undefined}
          className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
            params.open ? "border-ink bg-ink text-on-ink" : "border-border bg-surface text-ink hover:border-ocean/40"
          }`}
        >
          <span aria-hidden className="relative flex size-2">
            {params.open && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />}
            <span className="relative inline-flex size-2 rounded-full bg-mint-dot" />
          </span>
          Open for commissions
        </Link>

        <Rule />

        <div role="group" aria-label="Palette" className="flex shrink-0 items-center gap-1.5">
          {MOODS.map((mood, i) => {
            const on = params.color === mood.slug;
            return (
              <Link
                key={mood.slug}
                href={wallHref(params, { color: on ? undefined : mood.slug })}
                {...linkProps}
                aria-current={on ? "true" : undefined}
                aria-label={`${mood.name}: ${mood.hint.toLowerCase()}`}
                title={mood.name}
                className={`grid size-8 place-items-center transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-6 ${on ? "scale-110" : ""}`}
              >
                <span
                  aria-hidden
                  className={`grid size-6 place-items-center shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}`}
                  style={{
                    borderRadius: DAB_SHAPES[i % DAB_SHAPES.length],
                    background: `linear-gradient(135deg, ${mood.swatches[0]}, ${mood.swatches[2]} 55%, ${mood.swatches[4]})`,
                  }}
                >
                  {on && <Check className="size-3.5 text-white drop-shadow" strokeWidth={3} />}
                </span>
              </Link>
            );
          })}
        </div>

        <Rule />

        <nav aria-label="Order" className="flex shrink-0 items-center gap-0.5 text-sm">
          {SORTS.map(({ sort, label }) => (
            <SortLink key={sort} href={wallHref(params, { sort })} on={params.sort === sort}>
              {label}
            </SortLink>
          ))}
          <SortLink href={wallHref(params, { sort: "shuffle", seed: params.sort === "shuffle" ? params.seed + 1 : 7 })} on={params.sort === "shuffle"}>
            <Dices aria-hidden className="size-4" />
            Shuffle
          </SortLink>
        </nav>

      </div>
    </div>
  );
}

function SortLink({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      {...linkProps}
      aria-current={on ? "true" : undefined}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-semibold transition-colors ${
        on ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/** How many pieces, what's narrowing the wall (each removable), and the tile size. */
export function ActiveFilters({ params, total }: { params: WallParams; total: number }) {
  const mood = MOODS.find((m) => m.slug === params.color);
  const chips = [
    params.q && { label: `“${params.q}”`, href: wallHref(params, { q: "" }) },
    mood && { label: mood.name, href: wallHref(params, { color: undefined }) },
    params.open && { label: "Open for commissions", href: wallHref(params, { open: false }) },
  ].filter((chip): chip is { label: string; href: string } => Boolean(chip));

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2 px-2 py-2.5 text-sm sm:px-0">
      <p className="font-semibold text-ink tabular-nums" aria-live="polite">
        {total.toLocaleString("en-US")} {total === 1 ? "piece" : "pieces"}
      </p>
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          {...linkProps}
          aria-label={`Remove ${chip.label}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface pr-2 pl-3 text-xs font-semibold text-ink transition-colors hover:border-ocean/40"
        >
          {chip.label}
          <X aria-hidden className="size-3.5 text-muted" />
        </Link>
      ))}
      {chips.length > 1 && (
        <Link href={wallHref(params, { q: "", color: undefined, open: false })} {...linkProps} className="text-xs font-semibold text-accent-strong hover:underline">
          Clear all
        </Link>
      )}
      <div className="ml-auto">
        <TileSize />
      </div>
    </div>
  );
}
