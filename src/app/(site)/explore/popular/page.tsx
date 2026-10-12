import Image from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { ArrowRight, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { AdoptCard } from "@/components/explore/adopt-card";
import { HandNote, Scribble } from "@/components/explore/doodles";
import { ServiceSheet } from "@/components/listings/service-sheet";
import { ArtistCard } from "@/components/search/artist-card";
import { Rosette } from "@/components/search/rosette";
import { SiteHeader } from "@/components/site/site-header";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";
import { getTrending, type TrendingPiece } from "@/lib/search/trending";

const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  title: "Trending",
  description: "What people are pinning this week, the studios everyone's asking and the artists to follow.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * Trending, the way an art fair hands out ribbons: the week's most-liked
 * pieces get rosettes, then the studios and artists people go to most.
 * Plain counts (likes weighed down by age, followers, reviews), no model.
 * Fully prerendered from cached data.
 */
export default async function TrendingPage() {
  const trending = await getTrending();
  const [first, second, third, ...rest] = trending.pieces;

  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        <section className="grain relative -mt-16 pt-16">
          <div className={`${container} pt-10 pb-6 sm:pt-14`}>
            <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">Trending this week</p>
            <h1 className="mt-2 font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.03em] text-ink sm:text-[3.5rem]">
              The ribbon{" "}
              <span className="relative inline-block font-hand text-[1.25em] leading-[0.8] font-bold tracking-normal text-ocean">
                board.
                <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
              What people pinned this week, the studios everyone&apos;s asking and the artists to follow. Ranked by likes and
              follows, newest weighed up. No algorithm deciding for you.
            </p>
          </div>
        </section>

        {first && (
          <section aria-labelledby="ribbons" className={`${container} mt-6`}>
            <h2 id="ribbons" className="sr-only">
              Most liked this week
            </h2>
            <ol className="grid items-end gap-x-6 gap-y-14 pt-6 md:grid-cols-3">
              {/* A podium on wide screens (2nd · 1st · 3rd); in order on phones. */}
              {[first, second, third].map((piece, i) =>
                piece ? (
                  <li key={piece.id} className={["md:order-2", "md:order-1", "md:order-3"][i]}>
                    <Prize piece={piece} place={([1, 2, 3] as const)[i]} />
                  </li>
                ) : null,
              )}
            </ol>
          </section>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="runners-up" className={`${container} mt-16`}>
            <h2 id="runners-up" className="font-display text-xl font-extrabold text-ink">
              Honorable mentions
            </h2>
            <ol start={4} className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {rest.slice(0, 10).map((piece, i) => (
                <li key={piece.id}>
                  <Mention piece={piece} rank={i + 4} />
                </li>
              ))}
            </ol>
          </section>
        )}

        <Shelf id="featured" kicker="Featured artists" title="Studios to follow" note="most followed, taking work" href="/explore/search?type=artists&avail=open&sort=popular" label="All artists">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.artists.map((artist, i) => (
              <li key={artist.handle}>
                <ArtistCard artist={artist} priority={i < 3} />
              </li>
            ))}
          </ul>
        </Shelf>

        {trending.services.length > 0 && (
          <Shelf id="asked" kicker="Popular commissions" title="What everyone's asking for" href="/explore/search?sort=popular" label="All open commissions">
            <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {trending.services.map((hit) => (
                <li key={`${hit.artist.handle}-${hit.id}`}>
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
                    action={
                      <Link href={hit.href} className={buttonClasses({ size: "sm" })}>
                        Request
                      </Link>
                    }
                  />
                </li>
              ))}
            </ul>
          </Shelf>
        )}

        {trending.newcomers.length > 0 && (
          <Shelf id="newcomers" kicker="New on Artiflow" title="Fresh studios" note="be their first client ♡" href="/explore/search?type=artists&avail=open&sort=recent" label="All new artists">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.newcomers.map((artist) => (
                <li key={artist.handle}>
                  <ArtistCard artist={artist} />
                </li>
              ))}
            </ul>
          </Shelf>
        )}

        {trending.adoptables.length > 0 && (
          <Shelf id="adopts" kicker="Ready-made" title="Characters everyone's eyeing" href="/explore/search?type=adoptables&sort=popular" label="All adoptables">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-4 sm:gap-x-5 md:grid-cols-4">
              {trending.adoptables.slice(0, 4).map((hit) => (
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
          </Shelf>
        )}
      </main>
    </>
  );
}

/** A top-three piece in a white mat, with its rosette pinned on the frame and a wall label. */
function Prize({ piece, place }: { piece: TrendingPiece; place: 1 | 2 | 3 }) {
  const big = place === 1;
  return (
    <figure className="group relative">
      <Link href={piece.href} className="block">
        <div className={`relative rounded-[6px] bg-paper p-3 shadow-lift transition-transform duration-300 group-hover:-translate-y-1 sm:p-4 ${big ? "" : "md:scale-[0.92]"}`}>
          <div
            className="relative overflow-hidden rounded-[2px] bg-ice"
            style={{ aspectRatio: `${piece.image.width} / ${piece.image.height}`, maxHeight: big ? "34rem" : "26rem", backgroundColor: piece.image.palette?.[0] }}
          >
            <Image
              src={piece.image.src}
              alt={piece.image.alt || piece.title}
              fill
              priority={big}
              sizes="(min-width: 768px) 380px, 90vw"
              className="object-cover"
              style={{ objectPosition: piece.image.focus ?? "50% 30%" }}
            />
          </div>
        </div>
      </Link>
      <Rosette place={place} className={`absolute -top-6 -right-3 rotate-6 ${big ? "w-24" : "w-20"}`} />
      <figcaption className="mt-4 flex items-center gap-3 px-1">
        <Avatar image={{ ...piece.artist.avatar, alt: "" }} size={36} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.0625rem] font-extrabold text-ink">{piece.title}</p>
          <p className="truncate text-sm text-muted">
            by{" "}
            <Link href={piece.artist.href} className="font-semibold text-ink hover:underline">
              {piece.artist.name}
            </Link>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-like">
          <Heart aria-hidden className="size-4 fill-current" />
          {formatCompact(piece.likes)}
        </span>
      </figcaption>
    </figure>
  );
}

function Mention({ piece, rank }: { piece: TrendingPiece; rank: number }) {
  return (
    <Link href={piece.href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-ice" style={{ backgroundColor: piece.image.palette?.[0] }}>
        <Image src={piece.image.src} alt={piece.image.alt || piece.title} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: piece.image.focus ?? "50% 30%" }} />
        <span className="absolute top-2 left-2 rounded-full bg-paper/95 px-2 py-0.5 font-display text-xs font-extrabold text-on-paper shadow-soft">#{rank}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{piece.title}</p>
      <p className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{piece.artist.name}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <Heart aria-hidden className="size-3 fill-current text-like" />
          {formatCompact(piece.likes)}
        </span>
      </p>
    </Link>
  );
}

function Shelf({
  id,
  kicker,
  title,
  note,
  href,
  label,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  note?: string;
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${container} mt-24`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">{kicker}</p>
          <h2 id={id} className="mt-1.5 font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[2.125rem]">
            {title}
          </h2>
          {note && <HandNote className="mt-1 -rotate-2">{note}</HandNote>}
        </div>
        <Link href={href} className="group inline-flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className="underline-offset-4 group-hover:underline">{label}</span>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-on-ink transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      </div>
      {children}
    </section>
  );
}
