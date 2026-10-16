import Link from "next/link";
import { Caveat } from "next/font/google";
import { AdoptCard, DropCard } from "@/components/explore/adopt-card";
import { Scribble, Wash } from "@/components/explore/doodles";
import { ExploreSearch } from "@/components/explore/explore-search";
import { HeroCollage } from "@/components/explore/hero-collage";
import { Manifesto } from "@/components/explore/manifesto";
import { FeeFreeBanner } from "@/components/payments/fee-free-banner";
import { ResidentFeature } from "@/components/explore/resident-feature";
import { RotatingWord } from "@/components/explore/rotating-word";
import { SectionHeading } from "@/components/explore/section-heading";
import { StickerSheet } from "@/components/explore/sticker-sheet";
import { StudioBoard } from "@/components/explore/studio-board";
import { StudioSheet } from "@/components/explore/studio-sheet";
import { SiteHeader } from "@/components/site/site-header";
import {
  CATEGORIES,
  POPULAR_SEARCHES,
  PULSE,
  getExploreData,
  getSearchIndex,
  type StudioStatus,
} from "@/lib/explore";
import { formatCompact } from "@/lib/format";
import { ListingArt } from "@/components/listings/listing-art";
import { cellRatio, matOf } from "@/components/wall/mat";

// The artist's handwriting. Only the pages that use it load it.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  title: "Open studios",
  description: "Commission artists, adopt original characters and discover art made by real people.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

const BOARD: { status: StudioStatus; label: string }[] = [
  { status: "open", label: "Open now" },
  { status: "soon", label: "Opening soon" },
  { status: "closing", label: "Last slots" },
];

/*
 * Fully prerendered: everything here is cached data. Countdowns, tabs and the
 * wall's filters are small client islands working over the shipped data.
 */
export default async function ExplorePage() {
  const [index, data] = await Promise.all([getSearchIndex(), getExploreData()]);

  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        {/* Starts under the header (transparent until scrolled), so the grain and the wash reach the top. */}
        <section aria-labelledby="explore-heading" className="grain relative -mt-16 pt-16">
          <Wash id="hero-wash" className="-top-24 right-[-18%] h-[130%] w-[80%] max-lg:top-[38%] max-lg:right-[-30%] max-lg:h-[70%] max-lg:w-[140%]" />
          <div
            className={`${container} relative grid items-center gap-10 pt-8 pb-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:pt-14 lg:pb-20`}
          >
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pr-3 pl-2 text-xs font-semibold text-ink shadow-soft backdrop-blur-sm">
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-mint-dot" />
                </span>
                {formatCompact(PULSE.openStudios)} studios open for commissions
              </p>
              <h1
                id="explore-heading"
                className="mt-6 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem] xl:text-[4.5rem]"
              >
                <span className="block">
                  Your <RotatingWord words={["OC", "fursona", "ship", "pet", "story"]} />
                </span>
                <span className="block">deserves to be</span>
                <span className="relative mt-1 inline-block font-hand text-[1.32em] leading-[0.85] font-bold tracking-normal text-ocean">
                  drawn.
                  <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
                </span>
              </h1>
              <p className="mt-7 max-w-[28rem] text-lg leading-relaxed text-muted">
                Commission artists, adopt original characters and follow the people behind the art — every piece
                here is made by hand.
              </p>
              <div className="relative z-30 mt-8 max-w-xl">
                <ExploreSearch index={index} popular={POPULAR_SEARCHES} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-hand text-xl text-muted">try</span>
                {POPULAR_SEARCHES.slice(0, 4).map((q) => (
                  <Link
                    key={q}
                    href={`/explore/search?q=${encodeURIComponent(q)}`}
                    className="rounded-full border border-border bg-surface/70 px-3 py-1 text-ink backdrop-blur-sm transition-colors hover:border-ocean/40 hover:bg-surface"
                  >
                    {q}
                  </Link>
                ))}
                <Link href="/explore/popular" className="ml-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
                  or see what&apos;s trending →
                </Link>
              </div>
            </div>

            <HeroCollage pieces={data.hero} />
          </div>
        </section>

        <section aria-labelledby="categories-heading" className={`${container} mt-6 sm:mt-10`}>
          <SectionHeading
            id="categories-heading"
            kicker="Browse by craft"
            title="Find your kind of art"
            note="peel one off ✂"
            action={{ href: "/explore/search", label: "Search everything" }}
          />
          <div className="mt-8">
            <StickerSheet categories={CATEGORIES} />
          </div>
        </section>

        <section id="studios" aria-labelledby="studios-heading" className={`${container} mt-24 scroll-mt-20 sm:mt-28`}>
          <SectionHeading
            id="studios-heading"
            kicker={`${PULSE.openedToday} opened today`}
            title="Open studios"
            note="first come, first served!"
            action={{ href: "/explore/commissions", label: "All open commissions" }}
          />
          <div className="mt-8">
            <StudioBoard
              label="Commission openings"
              tabs={BOARD.map(({ status, label }) => ({
                key: status,
                label,
                sheets: data.studios
                  .filter((s) => s.status === status)
                  .map((studio) => ({ id: studio.id, draws: studio.draws, node: <StudioSheet studio={studio} /> })),
              }))}
            />
          </div>
        </section>

        {data.resident && (
          <section aria-labelledby="resident-heading" className="grain relative mt-24 overflow-hidden bg-ice py-16 sm:mt-28 sm:py-24">
            <Wash id="resident-wash" className="-top-1/4 -left-1/4 h-[150%] w-[80%] opacity-80" />
            <div className={`${container} relative`}>
              <ResidentFeature resident={data.resident} />
            </div>
          </section>
        )}

        <section aria-labelledby="adopts-heading" className={`${container} mt-24 sm:mt-28`}>
          <SectionHeading
            id="adopts-heading"
            kicker={`${formatCompact(PULSE.adoptsThisWeek)} adopted this week`}
            title="Characters looking for a home"
            note="each one comes with its ref sheet ♡"
            action={{ href: "/explore/adoptables", label: "Browse adoptables" }}
          />
          <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            <DropCard drop={data.drop} className="col-span-2 lg:col-span-1 lg:row-span-2" />
            {data.adopts.map((adopt) => (
              <AdoptCard key={adopt.id} adopt={adopt} />
            ))}
          </div>
        </section>

        <section aria-labelledby="wall-heading" className={`${container} mt-24 sm:mt-28`}>
          <SectionHeading
            id="wall-heading"
            kicker="The wall"
            title="Just here to look?"
            note="every piece, wall to wall"
            action={{ href: "/explore", label: "Explore the wall" }}
          />
          {/* One row of the wall, each piece at its own shape: the way in. */}
          <Link href="/explore" aria-label="Explore the wall" className="mt-8 flex gap-1.5 sm:gap-2">
            {data.wall.slice(0, 9).map((piece, i) => (
              <span
                key={piece.id}
                className={`relative overflow-hidden rounded-[10px] ${i >= 5 ? "max-sm:hidden" : ""} ${i >= 7 ? "max-lg:hidden" : ""}`}
                style={{ flex: `${cellRatio(piece.image)} 1 0`, aspectRatio: cellRatio(piece.image), backgroundColor: matOf(piece.image.palette) }}
              >
                <ListingArt image={piece.image} alt="" sizes="(min-width: 1024px) 200px, 30vw" />
              </span>
            ))}
          </Link>
        </section>

        {/* For artists: the founding offer, said plainly (only Artiflow's fee is off; Stripe's isn't). */}
        <div className={`${container} mt-24 sm:mt-28`}>
          <FeeFreeBanner action={{ href: "/studio", label: "Open your studio" }} />
        </div>

        <div className={`${container} mt-24 sm:mt-28`}>
          <Manifesto artists={data.crowd} />
        </div>
      </main>
    </>
  );
}
