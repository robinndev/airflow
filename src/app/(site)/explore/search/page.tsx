import Link from "next/link";
import { Caveat } from "next/font/google";
import { Suspense } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { AdoptCard } from "@/components/explore/adopt-card";
import { HandNote, Scribble } from "@/components/explore/doodles";
import { ExploreSearch } from "@/components/explore/explore-search";
import { Countdown } from "@/components/explore/countdown";
import { ServiceSheet } from "@/components/listings/service-sheet";
import { ArtistCard } from "@/components/search/artist-card";
import { SearchFilters } from "@/components/search/search-filters";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { POPULAR_SEARCHES, getSearchIndex } from "@/lib/explore";
import { categoryLabel, styleLabel } from "@/lib/listings/catalog";
import { drawLabel } from "@/lib/profile/draws";
import { DRAW_TAGS, LABELS, SERVICE_CATEGORY_IDS, STYLE_IDS, getSearchCatalog } from "@/lib/search/catalog";
import {
  activeFilters,
  adoptMatches,
  artistMatches,
  parseSearch,
  runSearch,
  searchHref,
  serviceMatches,
  type SearchParams,
  type SearchSort,
  type SearchType,
  type ServiceHit,
} from "@/lib/search/query";

const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  title: "Search",
  description: "Search open commissions, adoptables and artists by name, category, style, price and turnaround.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";
const KNOWN = { categories: SERVICE_CATEGORY_IDS, styles: STYLE_IDS, draws: DRAW_TAGS };

const TABS: { type: SearchType; label: string; hint: string; noun: [string, string] }[] = [
  { type: "commissions", label: "Commissions", hint: "Made to order: request, quote, pay, then it's drawn.", noun: ["studio", "studios"] },
  { type: "adoptables", label: "Adoptables", hint: "Ready-made: pay and the character is yours.", noun: ["character", "characters"] },
  { type: "artists", label: "Artists", hint: "The people behind the art.", noun: ["artist", "artists"] },
];

const SORTS: { sort: SearchSort; label: string }[] = [
  { sort: "relevance", label: "Relevance" },
  { sort: "recent", label: "Recent" },
  { sort: "popular", label: "Popular" },
];

export default function SearchPage(props: PageProps<"/explore/search">) {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        <Suspense fallback={<SearchSkeleton />}>
          <Search searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}

/** Same filters, as another tab would read them (availability starts over: it means something else there). */
const asType = (params: SearchParams, type: SearchType): SearchParams =>
  type === params.type ? params : { ...params, type, availability: type === "artists" ? "all" : "open" };

async function Search({ searchParams }: Pick<PageProps<"/explore/search">, "searchParams">) {
  const params = parseSearch(await searchParams, KNOWN);
  const [catalog, index] = await Promise.all([getSearchCatalog(), getSearchIndex()]);

  const results = {
    commissions: runSearch(catalog.services, asType(params, "commissions"), serviceMatches, LABELS),
    adoptables: runSearch(catalog.adoptables, asType(params, "adoptables"), adoptMatches, LABELS),
    artists: runSearch(catalog.artists, asType(params, "artists"), artistMatches, LABELS),
  };
  const tab = TABS.find((t) => t.type === params.type)!;
  const found = results[params.type];
  const shown = found.slice(0, params.limit);
  const filters = activeFilters(params);

  return (
    <>
      <section className="grain relative -mt-16 pt-16">
        <div className={`${container} grid gap-6 pt-8 pb-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end`}>
          <div>
            <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">Search the studios</p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-ink sm:text-[3rem]">
              {params.q ? (
                <>
                  Looking for{" "}
                  <span className="relative inline-block font-hand text-[1.2em] leading-[0.85] font-bold tracking-normal text-ocean">
                    {params.q}
                    <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
                  </span>
                </>
              ) : (
                <>Find your {params.type === "adoptables" ? "next character." : params.type === "artists" ? "artist." : "commission."}</>
              )}
            </h1>
          </div>
          <div className="relative z-30">
            <ExploreSearch key={params.q} index={index} popular={POPULAR_SEARCHES} initialValue={params.q} compact />
          </div>
        </div>
      </section>

      <div className={container}>
        {/* Index tabs: one per kind of listing, counts follow the query and filters. */}
        <nav aria-label="What to search" className="-mb-px flex gap-1 overflow-x-auto pt-2 [scrollbar-width:none]">
          {TABS.map((t) => {
            const on = t.type === params.type;
            return (
              <Link
                key={t.type}
                href={searchHref(asType(params, t.type))}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`relative flex shrink-0 items-baseline gap-2 rounded-t-[16px] border border-b-0 px-3 pt-2.5 pb-3 font-display text-[0.9375rem] font-bold transition-colors sm:px-5 ${
                  on ? "z-10 border-border bg-surface text-ink" : "border-transparent bg-ice/70 text-muted hover:bg-ice hover:text-ink"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-ink text-on-ink" : "bg-surface text-muted"}`}>
                  {results[t.type].length}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-b-[24px] rounded-tr-[24px] border border-border bg-surface p-4 shadow-soft sm:p-6">
          <p className="text-sm text-muted">{tab.hint}</p>

          <div className="mt-5 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside aria-label="Filters" className="lg:self-start">
              {/* Phones: folded away; wide screens: always open. */}
              <details className="group rounded-[18px] border border-border bg-canvas p-4 lg:hidden" open={filters.length > 0 ? true : undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <FiltersTitle count={filters.length} />
                </summary>
                <div className="mt-4">
                  <SearchFilters params={params} />
                </div>
              </details>
              <div className="hidden rounded-[18px] border border-border bg-canvas p-4 lg:block">
                <div className="flex items-center justify-between gap-2 font-display text-sm font-bold text-ink">
                  <FiltersTitle count={filters.length} />
                  {filters.length > 0 && (
                    <Link href={clearAll(params)} scroll={false} className="text-xs font-semibold text-accent-strong hover:underline">
                      Clear all
                    </Link>
                  )}
                </div>
                <div className="mt-4">
                  <SearchFilters params={params} />
                </div>
              </div>
            </aside>

            <section aria-label="Results" className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <HandNote tone="lilac" className="-rotate-1 text-[1.625rem]">
                  {found.length === 0
                    ? "nothing on the shelf…"
                    : `${found.length} ${found.length === 1 ? tab.noun[0] : tab.noun[1]}${params.type === "commissions" && params.availability === "open" ? " open now" : ""} ✶`}
                </HandNote>
                <SortStamps params={params} />
              </div>
              <ActiveChips params={params} />

              {found.length === 0 ? (
                <Empty params={params} />
              ) : params.type === "commissions" ? (
                <ul className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                  {(shown as ServiceHit[]).map((hit, i) => (
                    <li key={`${hit.artist.handle}-${hit.id}`}>
                      <ServiceResult hit={hit} priority={i < 3} />
                    </li>
                  ))}
                </ul>
              ) : params.type === "adoptables" ? (
                <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
                  {results.adoptables.slice(0, params.limit).map((hit) => (
                    <li key={`${hit.artist.handle}-${hit.id}`}>
                      <AdoptCard
                        adopt={{
                          id: hit.id,
                          name: hit.name,
                          species: hit.species,
                          image: hit.image,
                          artist: hit.artist,
                          sale: { type: "flat", priceUsd: hit.priceUsd },
                          status: hit.status === "sold" ? "adopted" : hit.status,
                          href: hit.href,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.artists.slice(0, params.limit).map((hit, i) => (
                    <li key={hit.handle}>
                      <ArtistCard artist={hit} priority={i < 3} />
                    </li>
                  ))}
                </ul>
              )}

              {found.length > shown.length && (
                <div className="mt-10 text-center">
                  <Link href={searchHref(params, { page: params.limit / 24 + 1 })} scroll={false} className={buttonClasses({ variant: "secondary" })}>
                    Show more
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function FiltersTitle({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SlidersHorizontal aria-hidden className="size-4" />
      Narrow it down
      {count > 0 && <span className="rounded-full bg-ocean px-1.5 text-xs text-white tabular-nums">{count}</span>}
    </span>
  );
}

const clearAll = (params: SearchParams) =>
  searchHref({ ...params, category: undefined, styles: [], draws: [], minUsd: undefined, maxUsd: undefined, turnaround: undefined, availability: params.type === "artists" ? "all" : "open" });

function ServiceResult({ hit, priority }: { hit: ServiceHit; priority: boolean }) {
  const soon = hit.status === "soon";
  return (
    <ServiceSheet
      service={{
        id: hit.id,
        ownerHandle: hit.artist.handle,
        category: hit.category,
        styles: hit.styles,
        title: hit.title,
        usage: { personal: { kind: "included" }, commercialContent: null, commercialMerch: null },
        description: hit.description,
        priceFromUsd: hit.priceFromUsd,
        turnaround: hit.turnaround,
        turnaroundDays: hit.turnaroundDays,
        includes: [],
        examples: hit.examples,
        packages: hit.packages,
      }}
      status={hit.status}
      slots={hit.slots}
      href={hit.href}
      artist={hit.artist}
      priority={priority}
      action={
        soon && hit.opensAt ? (
          <span className="text-xs font-semibold text-lilac-ink">
            Opens in <Countdown to={hit.opensAt} />
          </span>
        ) : (
          <Link href={hit.href} className={buttonClasses({ size: "sm" })}>
            {hit.status === "waitlist" ? "Join waitlist" : hit.status === "closed" ? "See studio" : "Request"}
          </Link>
        )
      }
    />
  );
}

function SortStamps({ params }: { params: SearchParams }) {
  return (
    <nav aria-label="Sort" className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-muted">Sort</span>
      {SORTS.map(({ sort, label }) => {
        const on = params.sort === sort;
        return (
          <Link
            key={sort}
            href={searchHref(params, { sort })}
            scroll={false}
            aria-current={on ? "true" : undefined}
            className={`rounded-[7px] border-2 px-2 py-[3px] font-display text-[0.6875rem] leading-none font-extrabold tracking-[0.12em] uppercase transition ${
              on ? "-rotate-2 border-ocean text-ocean-ink outline-1 outline-offset-2 outline-ocean" : "border-dashed border-border text-muted hover:border-ink/40 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** What's narrowing the results, each with an × to drop it. */
function ActiveChips({ params }: { params: SearchParams }) {
  const chips: { label: string; href: string }[] = [];
  if (params.category) chips.push({ label: categoryLabel(params.category), href: searchHref(params, { category: undefined }) });
  for (const style of params.styles) chips.push({ label: styleLabel(style), href: searchHref(params, { styles: params.styles.filter((s) => s !== style) }) });
  for (const draw of params.draws) chips.push({ label: drawLabel(draw), href: searchHref(params, { draws: params.draws.filter((d) => d !== draw) }) });
  if (params.minUsd !== undefined || params.maxUsd !== undefined) {
    const label = params.maxUsd === undefined ? `$${params.minUsd}+` : params.minUsd === undefined ? `Up to $${params.maxUsd}` : `$${params.minUsd}–${params.maxUsd}`;
    chips.push({ label, href: searchHref(params, { minUsd: undefined, maxUsd: undefined }) });
  }
  if (params.turnaround) chips.push({ label: { week: "Within a week", "2weeks": "Within 2 weeks", month: "Within a month" }[params.turnaround], href: searchHref(params, { turnaround: undefined }) });
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            scroll={false}
            aria-label={`Remove ${chip.label}`}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-ice pr-1.5 pl-2.5 text-xs font-semibold text-ink hover:bg-ice-strong"
          >
            {chip.label}
            <X aria-hidden className="size-3.5 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Empty({ params }: { params: SearchParams }) {
  const looser =
    params.type !== "artists" && params.availability === "open"
      ? { href: searchHref(params, { availability: "all" }), label: params.type === "adoptables" ? "Show adopted ones too" : "Include waitlists and closed studios" }
      : null;
  return (
    <div className="grain mt-8 rounded-[24px] border-2 border-dashed border-border bg-canvas px-6 py-14 text-center">
      <p className="font-display text-xl font-extrabold text-ink">Nothing matches all of that.</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        {params.q ? `Try fewer words than “${params.q}”, or` : "Try"} dropping a filter. Artists open and close slots all the time.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {looser && (
          <Link href={looser.href} scroll={false} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            {looser.label}
          </Link>
        )}
        <Link href={params.q ? `/explore/search?q=${encodeURIComponent(params.q)}${params.type === "commissions" ? "" : `&type=${params.type}`}` : "/explore/search"} className={buttonClasses({ size: "sm" })}>
          {params.q ? "Keep the words, drop the filters" : "Clear everything"}
        </Link>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div aria-busy aria-label="Searching" className={`${container} pt-10`}>
      <div className="skeleton h-12 w-96 max-w-full rounded-input bg-ice" />
      <div className="skeleton mt-8 h-11 w-80 rounded-t-[16px] bg-ice" />
      <div className="mt-0 grid gap-6 rounded-[24px] border border-border p-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="skeleton h-96 rounded-[18px] bg-ice" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-80 rounded-[24px] bg-ice" />
          ))}
        </div>
      </div>
    </div>
  );
}
