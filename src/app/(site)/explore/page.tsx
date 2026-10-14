import Link from "next/link";
import Form from "next/form";
import { Caveat } from "next/font/google";
import { Search } from "lucide-react";
import { Suspense, type CSSProperties } from "react";
import { HandNote, Scribble } from "@/components/explore/doodles";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { ActiveFilters, WallRail } from "@/components/wall/rail";
import { Salon } from "@/components/wall/salon";
import { tileSizeScript } from "@/components/wall/tile-size";
import { getWallCatalog } from "@/lib/wall/catalog";
import {
  WALL_PAGE,
  parseWall,
  runWall,
  wallCounts,
  wallFilters,
  wallHref,
  wallQuery,
  type WallParams,
} from "@/lib/wall/query";

// The artist's handwriting, for the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  title: "Explore",
  description:
    "Every piece on Artiflow, wall to wall: art, original characters, adoptables and commissions, each hung at its own size.",
};

/** Masthead and controls; the wall itself runs closer to the edge on phones (more art). */
const wide = "mx-auto w-full max-w-[1800px] px-4 lg:px-6";
const wallWidth = "mx-auto w-full max-w-[1800px] px-2 sm:px-4 lg:px-6";

const TRY = ["fox", "pixel art", "mermaid", "chibi", "ref sheet"];

/*
 * Explore: the salon wall. Everything on Artiflow hung edge to edge, each
 * piece at its own size, as many as fit (unlike the home feed, which follows
 * a piece through its stages). The masthead is static; the search box, the
 * controls and the wall read the URL and stream in.
 */
export default function ExplorePage(props: PageProps<"/explore">) {
  return (
    <>
      <SiteHeader wide />
      {/* The viewer's tile size, before the wall paints. */}
      <script dangerouslySetInnerHTML={{ __html: tileSizeScript }} />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        <section aria-labelledby="explore-heading" className={`${wide} pt-3 pb-4 sm:pt-8 sm:pb-5`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">Explore</p>
              <h1
                id="explore-heading"
                className="mt-1.5 font-display text-[2rem] leading-[1] font-extrabold tracking-[-0.03em] text-ink sm:text-[3rem]"
              >
                Everything,{" "}
                <span className="relative inline-block font-hand text-[1.18em] leading-[0.8] font-bold tracking-normal text-ocean">
                  wall to wall.
                  <Scribble className="absolute -bottom-2 left-[-3%] w-[106%] text-mint" />
                </span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-[0.9375rem] text-muted max-sm:hidden">
                Art, characters, adoptables and commissions from every studio, each hung at its own size. Nothing
                cropped, nothing generated.
              </p>
            </div>

            <div className="w-full lg:max-w-[30rem]">
              <Suspense fallback={<SearchBox />}>
                <WallSearch searchParams={props.searchParams} />
              </Suspense>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-hand text-lg text-muted">try</span>
                {TRY.map((q) => (
                  <Link
                    key={q}
                    href={`/explore?q=${encodeURIComponent(q)}`}
                    prefetch={false}
                    className="rounded-full border border-border bg-surface/70 px-2.5 py-0.5 text-[0.8125rem] text-ink transition-colors hover:border-ocean/40 hover:bg-surface"
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Suspense fallback={<WallSkeleton />}>
          <Wall searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function WallSearch({ searchParams }: Pick<PageProps<"/explore">, "searchParams">) {
  return <SearchBox params={parseWall(await searchParams)} />;
}

/** A plain GET form: the rest of the wall's filters ride along. */
function SearchBox({ params }: { params?: WallParams }) {
  const rest = params ? [...new URLSearchParams(wallQuery(params, { q: "" }))] : [];
  return (
    <Form action="/explore" role="search" className="relative">
      {rest.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[1.125rem] -translate-y-1/2 text-muted" />
      <input
        key={params?.q}
        type="search"
        name="q"
        defaultValue={params?.q}
        aria-label="Search the wall"
        placeholder="Search art, characters, @artists…"
        className="h-12 w-full rounded-full border border-border bg-surface pr-4 pl-11 text-[0.9375rem] text-ink shadow-soft outline-none transition-colors placeholder:text-muted/80 focus:border-ocean"
      />
    </Form>
  );
}

async function Wall({ searchParams }: Pick<PageProps<"/explore">, "searchParams">) {
  const params = parseWall(await searchParams);
  const { entries, now } = await getWallCatalog();
  const found = runWall(entries, params, now);
  const query = wallQuery(params);

  return (
    <>
      <WallRail params={params} counts={wallCounts(entries, params)} />
      <div className={wallWidth}>
        <ActiveFilters params={params} total={found.length} />
        {found.length === 0 ? (
          <EmptyWall params={params} />
        ) : (
          <Salon
            key={query}
            query={query}
            initial={found.slice(0, WALL_PAGE).map((entry) => entry.item)}
            more={found.length > WALL_PAGE}
          />
        )}
      </div>
    </>
  );
}

const LOOSEN: Record<ReturnType<typeof wallFilters>[number], { label: string; changes: Partial<WallParams> }> = {
  q: { label: "Drop the search", changes: { q: "" } },
  show: { label: "Show everything", changes: { show: "all" } },
  color: { label: "Any colors", changes: { color: undefined } },
  open: { label: "Every artist", changes: { open: false } },
};

function EmptyWall({ params }: { params: WallParams }) {
  const narrowed = wallFilters(params);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <HandNote className="-rotate-2 text-[1.75rem]">a bare wall…</HandNote>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">Nothing hanging here yet</p>
      <p className="mt-2 text-[0.9375rem] text-muted">Loosen a filter and the wall fills back up.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {narrowed.map((key) => (
          <Link key={key} href={wallHref(params, LOOSEN[key].changes)} scroll={false} className={buttonClasses({ variant: "secondary" })}>
            {LOOSEN[key].label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Tile shapes for the placeholder wall: a mix of portrait, square and landscape. */
const GHOSTS = [0.75, 1, 1.5, 0.7, 1.33, 0.8, 1, 1.78, 0.66, 1.2, 0.75, 1, 1.5, 0.8, 0.7, 1.33, 1, 0.75, 2, 0.9, 1.25, 0.7, 1, 1.5];

function WallSkeleton() {
  return (
    <div aria-hidden>
      <div className="sticky top-16 z-30 border-b border-border/70 bg-canvas/90">
        <div className={`${wide} flex h-[3.3125rem] items-center gap-2`}>
          {[7, 4, 7, 7].map((w, i) => (
            <span key={i} className="skeleton h-9 rounded-full bg-ice" style={{ width: `${w}rem` }} />
          ))}
        </div>
      </div>
      <div className={wallWidth}>
        <div className="h-[3.25rem]" />
        <ul className="salon-rows flex flex-wrap gap-1 after:grow-[999] after:content-[''] sm:gap-1.5">
          {GHOSTS.map((ratio, i) => (
            <li
              key={i}
              className="skeleton rounded-[10px] bg-ice"
              style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio})`, aspectRatio: ratio } as CSSProperties}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
