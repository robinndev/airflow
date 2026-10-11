import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { Bookmark } from "lucide-react";
import { Suspense } from "react";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { SectionHeading } from "@/components/explore/section-heading";
import { BoardSkeleton, EmptyWall, SignedOutWall } from "@/components/favorites/bare-wall";
import { isLineItem, Line, type LineItem } from "@/components/favorites/line";
import { SwatchCard, SwatchCardSkeleton } from "@/components/favorites/swatch-card";
import { Wall } from "@/components/favorites/wall";
import { SiteHeader } from "@/components/site/site-header";
import { getViewerFavorites, type FavoriteArt, type FavoritePost } from "@/lib/favorites/queries";

// The artist's handwriting: the hand-lettered title and the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Favorites",
  description: "Everything you saved on Artiflow, pinned to one wall: art, posts and the commissions you're saving up for.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * Favorites, kept like an artist's moodboard: a swatch card mixed from your
 * colors, a line of commissions and adoptables you're saving up for, and the
 * wall of art and posts that stopped your scroll. The masthead prerenders;
 * everything else is the viewer's own and streams in.
 */
export default function FavoritesPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        {/* Starts under the header (transparent until scrolled), so the grain and the wash reach the top. */}
        <section
          aria-labelledby="favorites-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash id="favorites-wash" className="top-[-10%] right-[-12%] h-[120%] w-[75%] opacity-80 max-lg:top-[40%] max-lg:w-[130%]" />
          <div
            className={`${container} relative grid items-center gap-x-12 gap-y-14 pt-10 pb-12 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pt-16 lg:pb-16`}
          >
            <div>
              <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
                <Bookmark aria-hidden className="size-3.5 fill-current text-ocean" />
                Favorites
              </p>
              <h1
                id="favorites-heading"
                className="mt-4 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem]"
              >
                Your{" "}
                <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
                  moodboard.
                  <Scribble className="absolute right-[-3%] -bottom-3.5 w-[62%] text-mint" />
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
                Everything you saved, pinned to one wall: the art that stopped your scroll, the posts you want to
                remember and the commissions you&apos;re saving up for.
              </p>
              <Sparkle className="absolute top-16 left-[46%] hidden size-5 text-lilac lg:block" />
            </div>

            <Suspense fallback={<SwatchCardSkeleton />}>
              <YourColors />
            </Suspense>
          </div>
        </section>

        <Suspense fallback={<BoardSkeleton className={`${container} mt-10`} />}>
          <Moodboard />
        </Suspense>
      </main>
    </>
  );
}

async function YourColors() {
  return <SwatchCard items={await getViewerFavorites()} />;
}

async function Moodboard() {
  const items = await getViewerFavorites();
  if (!items || items.length === 0) {
    return <div className={`${container} mt-6`}>{items ? <EmptyWall /> : <SignedOutWall />}</div>;
  }

  const line = items.filter((item): item is LineItem => item.kind !== "post" && isLineItem(item));
  const wall = items.filter((item): item is FavoriteArt | FavoritePost => item.kind === "post" || (item.kind === "art" && !isLineItem(item)));

  return (
    <>
      {line.length > 0 && (
        <section aria-labelledby="line-heading" className={`${container} mt-8`}>
          <SectionHeading id="line-heading" kicker="On the line" title="Saving up for" note="payday can't come soon enough">
            <p className="mt-3 max-w-xl text-[0.9375rem] text-muted">
              Commissions and characters you saved, with where they stand right now.
            </p>
          </SectionHeading>
          <div className="mt-8">
            <Line items={line} />
          </div>
        </section>
      )}

      {wall.length > 0 && (
        <section id="wall" aria-labelledby="wall-heading" className={`${container} mt-16 scroll-mt-24 sm:mt-20`}>
          <SectionHeading id="wall-heading" kicker="On the wall" title="Stopped you mid-scroll" note="tap the pin to take one down" />
          <div className="mt-8">
            <Wall items={wall} />
          </div>
        </section>
      )}
    </>
  );
}
