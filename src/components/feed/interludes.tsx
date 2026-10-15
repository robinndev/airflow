import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { HandNote, Sparkle, Tape } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { ListingArt } from "@/components/listings/listing-art";
import { FollowButton, FollowerCount } from "@/components/profile/follow-button";
import { buttonClasses } from "@/components/ui/button";
import type { Studio } from "@/lib/explore";
import { formatUsd } from "@/lib/format";
import type { ArtistProfile } from "@/lib/profile/types";

/*
 * Discovery lives between the pieces, like inserts in a magazine — not in a
 * sidebar competing with the art. Each one is a different object.
 */

function InterludeHeading({
  id,
  kicker,
  title,
  note,
  action,
}: {
  id: string;
  kicker: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div>
        <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">{kicker}</p>
        <h2 id={id} className="mt-1.5 font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[2.125rem]">
          {title}
        </h2>
        {note && <HandNote className="mt-1 -rotate-2">{note}</HandNote>}
      </div>
      {action && (
        <Link href={action.href} className="group inline-flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className="underline-offset-4 group-hover:underline">{action.label}</span>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-on-ink transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      )}
    </div>
  );
}

const coverOf = (studio: Studio) => studio.tiers.at(-1)?.image ?? studio.tiers[0].image;

/** The mat's shape: the art's, kept between 1:2 and 12:5 like the Explore wall (the art itself is never cropped). */
const matRatio = ({ width, height }: { width: number; height: number }) => Math.min(2.4, Math.max(0.5, width / height));

/**
 * Commission sheets that are open right now, as cover cards. Each piece hangs
 * whole on a mat tinted with its own color, at most at its real size (a small
 * pixel GIF stays small), and nothing is printed over it. Desktop: one
 * justified row, every mat the same height and as wide as its art's shape.
 * Phones: a row to scroll sideways, every mat the same height.
 */
export function OpenStudios({ studios }: { studios: Studio[] }) {
  if (studios.length === 0) return null;
  return (
    <section aria-labelledby="feed-studios">
      <InterludeHeading
        id="feed-studios"
        kicker="Between pieces"
        title="Studios taking commissions"
        note="first come, first served!"
        action={{ href: "/explore/commissions", label: "All open studios" }}
      />
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 items-start gap-4 overflow-x-auto px-4 pt-2 pb-3 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:snap-none lg:gap-5 lg:overflow-visible lg:px-0">
        {studios.map((studio) => {
          const ratio = matRatio(coverOf(studio));
          return (
            <li
              key={studio.id}
              // Phones: 20rem tall, as wide as the mat. Desktop: widths share the row by shape, so heights match.
              className="w-[calc(20rem*var(--ratio))] max-w-[85vw] min-w-52 shrink-0 snap-start lg:w-auto lg:max-w-none lg:min-w-0 lg:shrink lg:basis-0 lg:grow-(--ratio)"
              style={{ "--ratio": ratio } as CSSProperties}
            >
              <StudioCover studio={studio} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StudioCover({ studio }: { studio: Studio }) {
  const cover = coverOf(studio);
  const left = studio.slots.total - studio.slots.taken;
  const from = Math.min(...studio.tiers.map((t) => t.priceUsd));

  return (
    <article className="group relative">
      {/* The mat: the art whole and at most its real size, on its own color. Nothing sits on top of it. */}
      <div
        className="relative overflow-hidden rounded-[20px] bg-ice shadow-soft transition-[box-shadow,translate] duration-300 group-hover:-translate-y-1 group-hover:shadow-lift"
        style={{ aspectRatio: matRatio(cover), backgroundColor: cover.palette?.[0] }}
      >
        <ListingArt image={cover} sizes="(min-width: 1024px) 420px, 85vw" />
      </div>
      <div className="mt-3 flex items-start gap-2.5 px-0.5">
        <Image
          src={studio.artist.avatar.src}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover"
          style={{ objectPosition: studio.artist.avatar.focus }}
        />
        <span className="min-w-0 flex-1">
          <Link href={studio.href} className="block truncate text-sm font-bold text-ink after:absolute after:inset-0">
            {studio.artist.name}
          </Link>
          <span className="block truncate text-xs text-muted">{studio.specialty}</span>
        </span>
        <Stamp tone={studio.status === "closing" ? "like" : "mint"} className="mt-0.5 shrink-0 rotate-3 bg-surface">
          {studio.status === "closing" ? (left === 1 ? "Last slot!" : `${left} left`) : "Open"}
        </Stamp>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span aria-hidden className="size-2 rounded-full bg-mint-strong shadow-[0_0_0_3px_color-mix(in_oklab,var(--mint)_22%,transparent)]" />
          {left} of {studio.slots.total} slots open
        </span>
        <p className="shrink-0 text-sm text-muted">
          from <span className="font-display text-base font-extrabold text-ink">{formatUsd(from)}</span>
        </p>
      </div>
    </article>
  );
}

const PRINTS = [
  { rotate: -7, x: "-34%", y: "6%", z: 1, tape: "lilac" as const },
  { rotate: 2, x: "0%", y: "-4%", z: 3, tape: "mint" as const },
  { rotate: 8, x: "34%", y: "8%", z: 2, tape: undefined },
];

/** Someone you don't follow yet, with three of their pieces spread on the table. */
export function StudioVisit({ profile }: { profile: ArtistProfile }) {
  const prints = profile.gallery.preview.slice(0, 3);
  return (
    <section
      aria-labelledby="feed-visit"
      className="grain relative overflow-hidden rounded-panel border border-border/80 bg-surface/70 p-6 shadow-soft backdrop-blur-md sm:p-10"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div aria-hidden className="relative mx-auto aspect-[5/4] w-full max-w-[26rem]">
          {prints.map((image, i) => {
            const p = PRINTS[i];
            return (
              <span
                key={image.src}
                className="absolute top-[12%] left-[31%] w-[38%] rounded-[6px] bg-paper p-1.5 shadow-lift transition-[rotate,translate] duration-700 ease-out"
                style={{ rotate: `${p.rotate}deg`, translate: `${p.x} ${p.y}`, zIndex: p.z } as CSSProperties}
              >
                {p.tape && <Tape tone={p.tape} className="-top-3 left-1/2 w-16 -translate-x-1/2 rotate-[-6deg]" />}
                <span
                  className="relative block aspect-3/4 overflow-hidden rounded-[3px]"
                  style={{ backgroundColor: image.palette?.[0] }}
                >
                  <Image src={image.src} alt="" fill sizes="170px" className="object-cover" style={{ objectPosition: image.focus ?? "50% 30%" }} />
                </span>
              </span>
            );
          })}
          <Sparkle className="absolute top-0 right-[8%] size-5 text-lilac" />
          <Sparkle className="absolute bottom-[4%] left-[6%] size-3.5 text-mint" />
        </div>

        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3">
            <span className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Studio visit</span>
            <HandNote tone="accent" className="-rotate-2">someone new ✶</HandNote>
          </p>
          <h2 id="feed-visit" className="mt-2 font-display text-[2.25rem] leading-none font-extrabold tracking-tight text-ink sm:text-[2.75rem]">
            <Link href={`/${profile.handle}`} className="hover:underline">
              {profile.displayName}
            </Link>
          </h2>
          <p className="mt-2 text-[0.9375rem] text-muted">{profile.headline}</p>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-pretty text-ink/85">{profile.bio}</p>
          <p className="mt-5 flex gap-5 text-sm text-muted">
            <span>
              <span className="font-display text-lg font-extrabold text-ink">
                <FollowerCount handle={profile.handle} count={profile.stats.followers} />
              </span>{" "}
              followers
            </span>
            <span>
              <span className="font-display text-lg font-extrabold text-ink">{profile.stats.artworks}</span> pieces
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <FollowButton handle={profile.handle} />
            <Link href={`/${profile.handle}`} className={buttonClasses({ variant: "secondary" })}>
              Visit the studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** What people are drawing, scrolling past like a gallery banner. Pauses on hover. */
export function TagMarquee({ tags }: { tags: string[] }) {
  const track = (copy: number) => (
    <ul aria-hidden={copy > 0 || undefined} className="flex shrink-0 items-center gap-8 pr-8 sm:gap-12 sm:pr-12">
      {tags.map((tag, i) => (
        <li key={tag} className="flex items-center gap-8 sm:gap-12">
          <Link
            href={`/explore/search?q=${encodeURIComponent(tag)}`}
            tabIndex={copy > 0 ? -1 : undefined}
            className={`font-display text-[2.5rem] leading-none font-extrabold tracking-tight whitespace-nowrap transition-colors sm:text-[3.5rem] ${
              i % 2
                ? "text-transparent [-webkit-text-stroke:1.5px_var(--color-ink)] hover:text-ink"
                : "text-ink hover:text-ocean"
            }`}
          >
            #{tag}
          </Link>
          <Sparkle className={`size-5 shrink-0 ${["text-mint", "text-lilac", "text-sky", "text-ocean"][i % 4]}`} />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="feed-tags" className="relative left-1/2 w-screen -translate-x-1/2">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <h2 id="feed-tags" className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
          On the drawing table this week
        </h2>
      </div>
      <div className="mt-4 overflow-hidden border-y border-ink/10 py-6 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {track(0)}
          {track(1)}
        </div>
      </div>
    </section>
  );
}
