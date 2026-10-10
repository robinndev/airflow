import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { Resident } from "@/lib/explore";
import { formatCompact, formatUsd } from "@/lib/format";
import { HandNote, Sparkle, Tape } from "./doodles";
import { SlotMeter } from "./slot-meter";

const FRAMES = [
  { className: "top-[4%] left-0 w-[84%]", rotate: -1.5, sizes: "(min-width: 1024px) 480px, 84vw" },
  { className: "top-[30%] right-0 w-[31%]", rotate: 4, sizes: "(min-width: 1024px) 180px, 31vw" },
  { className: "top-[57%] left-[7%] w-[27%]", rotate: -6, sizes: "(min-width: 1024px) 160px, 27vw" },
];

/** Weekly editorial feature: one artist, their work and their menu. */
export function ResidentFeature({ resident }: { resident: Resident }) {
  const { artist } = resident;

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
      <div className="relative aspect-5/4 w-full">
        {resident.works.slice(0, FRAMES.length).map((work, i) => {
          const frame = FRAMES[i];
          const polaroid = i === 2;
          return (
            <Link
              key={work.title}
              href={work.href}
              className={`group/frame absolute block bg-paper shadow-lift transition-[rotate,scale] duration-500 rotate-(--r) hover:z-20 hover:scale-[1.03] hover:rotate-0 ${
                polaroid ? "rounded-[6px] p-2 pb-9" : "rounded-[16px] p-1.5"
              } ${frame.className}`}
              style={{ "--r": `${frame.rotate}deg`, zIndex: i === 1 ? 2 : 1 } as CSSProperties}
            >
              {i === 0 && <Tape tone="lilac" className="-top-3 left-8 -rotate-[8deg]" />}
              {i === 1 && <Tape tone="mint" className="-top-3 left-1/2 w-16 -translate-x-1/2 rotate-[5deg]" />}
              <span
                className={`relative block overflow-hidden ${polaroid ? "rounded-[2px]" : "rounded-[11px]"}`}
                style={{ aspectRatio: `${work.image.width} / ${work.image.height}`, backgroundColor: work.image.palette?.[0] }}
              >
                <Image src={work.image.src} alt={work.image.alt} fill sizes={frame.sizes} className="object-cover" />
              </span>
              {polaroid ? (
                <HandNote tone="paper" className="absolute inset-x-0 bottom-2 text-center text-lg">
                  {work.title.replace(/^Quiet Worlds II — /, "")}, &apos;26
                </HandNote>
              ) : (
                <span className="sr-only">{work.title}</span>
              )}
            </Link>
          );
        })}
        <Sparkle className="absolute -top-2 right-[14%] size-6 text-sky" />
        <Sparkle className="absolute right-[36%] bottom-[6%] size-4 text-lilac" />
      </div>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <HandNote tone="accent" className="-rotate-2 text-[1.625rem]">
            artist in residence
          </HandNote>
          <span className="text-xs font-bold tracking-[0.18em] text-muted uppercase">This week</span>
        </p>
        <h2
          id="resident-heading"
          className="mt-3 flex items-center gap-2 font-display text-[2.5rem] leading-none font-extrabold tracking-tight text-ink sm:text-[3.25rem]"
        >
          <Link href={resident.href} className="hover:underline">
            {artist.name}
          </Link>
          {artist.verified && <BadgeCheck aria-label="Verified" className="size-7 shrink-0 fill-ocean text-ice" />}
        </h2>
        <p className="mt-3 text-[0.9375rem] text-muted">
          {artist.headline}
          {artist.location && (
            <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap">
              <MapPin aria-hidden className="size-3.5" />
              {artist.location}
            </span>
          )}
        </p>

        <figure className="relative mt-8 pl-1">
          <span aria-hidden className="absolute -top-9 -left-3 font-hand text-[5.5rem] leading-none text-ocean/35">
            “
          </span>
          <blockquote className="relative font-display text-[1.5rem] leading-snug font-semibold text-balance text-ink sm:text-[1.75rem]">
            {resident.quote}
          </blockquote>
          <figcaption className="mt-2">
            <HandNote tone="ocean" className="text-[1.75rem]">
              — {artist.name.split(" ")[0]}
            </HandNote>
          </figcaption>
        </figure>

        <dl className="mt-8 grid grid-cols-3 divide-x divide-border rounded-[18px] border border-border bg-surface">
          <div className="px-4 py-3">
            <dt className="text-xs text-muted">Followers</dt>
            <dd className="font-display text-xl font-extrabold text-ink">{formatCompact(resident.followers)}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-xs text-muted">Artworks</dt>
            <dd className="font-display text-xl font-extrabold text-ink">{resident.artworks}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-xs text-muted">{resident.rating.count} reviews</dt>
            <dd className="flex items-center gap-1 font-display text-xl font-extrabold text-ink">
              <Star aria-hidden className="size-4 fill-star text-star" />
              {resident.rating.average.toFixed(1)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-[18px] border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <HandNote className="text-2xl">on the menu</HandNote>
            <SlotMeter total={resident.slots.total} taken={resident.slots.taken} />
          </div>
          <ul className="mt-3 space-y-1">
            {resident.menu.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="group flex items-baseline gap-2 rounded-[8px] py-1 text-[0.9375rem] transition-colors"
                >
                  <span className="font-medium text-ink group-hover:underline">{item.title}</span>
                  {item.discountPercent && (
                    <span className="rounded-full bg-lilac/15 px-1.5 text-[0.6875rem] font-bold text-lilac-ink">
                      −{item.discountPercent}%
                    </span>
                  )}
                  <span aria-hidden className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-border" />
                  <span className="font-display font-bold text-ink">from {formatUsd(item.priceUsd)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={resident.href} className={buttonClasses({ size: "lg" })}>
            Visit the studio
          </Link>
          <Link href={`${resident.href}/commissions`} className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Request a commission
          </Link>
        </div>
      </div>
    </div>
  );
}
