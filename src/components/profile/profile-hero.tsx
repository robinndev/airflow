import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { FramedAvatar } from "@/components/frames/avatar-frame";
import { Avatar } from "@/components/ui/avatar";
import { HEADER_SENTINEL_ID } from "@/components/site/header-shell";
import { formatCompact, formatMonthYear } from "@/lib/format";
import type { Customization } from "@/lib/customization/model";
import { nameStyle } from "@/lib/customization/style";
import { artistLabels, exploreDrawsHref } from "@/lib/profile/draws";
import type { ArtistProfile, ResolvedAppearance } from "@/lib/profile/types";
import { ArtistMark, CollectorMark } from "@/components/artists/artist-mark";
import { AvailabilityBadge } from "./availability-badge";
import { FollowerCount } from "./follow-button";
import { CommissionStatusPill } from "./commission-status-pill";
import { OwnerImageControls, ProfileActions } from "./profile-actions";

type ProfileHeroProps = {
  profile: ArtistProfile;
  appearance: ResolvedAppearance;
  /** Already gated by plan (see customizationFor). */
  custom: Customization;
};

export function ProfileHero({ profile, appearance, custom }: ProfileHeroProps) {
  const name = nameStyle(custom);
  return (
    <section aria-labelledby="profile-name" className="relative">
      {/*
        Full-bleed banner under the floating header (the profile canvas
        around it is pulled up by -mt-16).
        It's the LCP element, so it loads eagerly with high priority.
      */}
      {/* Painted in the banner's own dominant color while it loads, so a reload never flashes light. */}
      <div
        data-part="banner"
        className="relative h-[clamp(15rem,30vw,24rem)] overflow-hidden bg-ice"
        style={{ backgroundColor: profile.banner.palette?.[0] }}
      >
        <Image
          src={profile.banner.src}
          alt={profile.banner.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: `50% ${appearance.bannerFocusY}%` }}
        />
        <BannerScrims />
        <Suspense>
          <OwnerImageControls handle={profile.handle} slot="banner" />
        </Suspense>
      </div>

      <div className="mx-auto max-w-[1184px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div data-part="avatar" className="group/avatar relative -mt-14 w-fit shrink-0 sm:-mt-20">
              <FramedAvatar frame={custom.frame}>
                <Avatar
                  image={profile.avatar}
                  size={152}
                  preload
                  className="size-28 shadow-lift ring-[5px] ring-surface sm:size-38"
                />
              </FramedAvatar>
              <Suspense>
                <OwnerImageControls handle={profile.handle} slot="avatar" />
              </Suspense>
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1
                  id="profile-name"
                  data-part="name"
                  style={name.style}
                  className={`font-display text-[calc(1.75rem*var(--name-scale,1))] leading-tight font-extrabold tracking-tight text-ink sm:text-[calc(2rem*var(--name-scale,1))] ${name.className}`}
                >
                  {profile.displayName}
                </h1>
                <ArtistMark profile={profile} />
              </div>
              <p data-part="handle" className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.9375rem] text-muted">
                <span className="font-medium text-ink/80">@{profile.handle}</span>
                {profile.pronouns && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{profile.pronouns}</span>
                  </>
                )}
                <CollectorMark profile={profile} />
              </p>
            </div>
          </div>

          <div data-part="actions" className="flex flex-wrap items-center gap-2 md:pb-1">
            <Suspense fallback={<ActionsPlaceholder />}>
              <ProfileActions handle={profile.handle} sells={profile.artist !== null} />
            </Suspense>
          </div>
        </div>

        {/* The stats column is the sidebar's width, so the card lines up with the cards below it. */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div className="max-w-2xl">
            {profile.headline && (
              <p data-part="headline" className="font-display text-[1.0625rem] font-semibold text-ink">
                {profile.headline}
              </p>
            )}
            <p data-part="bio" className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink/80">{profile.bio}</p>
            {profile.draws.length > 0 && (
              <ul data-part="draws" aria-label="What they draw" className="mt-3 flex flex-wrap gap-1.5">
                {artistLabels(profile.draws).map(({ tag, label }) => (
                  <li key={tag}>
                    {/* Each label finds more artists like this one. */}
                    <Link
                      href={exploreDrawsHref(tag)}
                      className="inline-flex h-7 items-center rounded-full bg-lilac/12 px-2.5 text-[0.8125rem] font-semibold text-lilac-ink transition-colors hover:bg-lilac/20"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ul data-part="meta" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {/* Collectors don't sell, so they have no commission status. */}
              {profile.artist !== null && (
                <li>
                  {/* Availability is the headline status; commission details live in the sidebar. */}
                  {profile.availability ? (
                    <AvailabilityBadge handle={profile.handle} note={profile.availability.note} />
                  ) : (
                    <CommissionStatusPill status={profile.commissions.status} />
                  )}
                </li>
              )}
              {profile.location && (
                <li className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4" />
                  {profile.location}
                </li>
              )}
              <li className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden className="size-4" />
                Joined {formatMonthYear(profile.joinedAt)}
              </li>
            </ul>
          </div>

          <dl data-part="stats" className="flex gap-1 rounded-card border border-border bg-surface p-1.5 shadow-soft sm:max-w-[300px] lg:max-w-none">
            <Stat label="Followers">
              <FollowerCount handle={profile.handle} count={profile.stats.followers} />
            </Stat>
            <Stat label="Following">{formatCompact(profile.stats.following)}</Stat>
            <Stat label="Artworks">{formatCompact(profile.stats.artworks)}</Stat>
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Top scrim keeps the white header legible on any banner; the sentinel tells the header when to turn solid. */
export function BannerScrims() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-scrim/45 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-scrim/20 to-transparent"
      />
      <div id={HEADER_SENTINEL_ID} aria-hidden className="absolute inset-x-0 bottom-0 h-px" />
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col-reverse items-center rounded-input px-2 py-2 text-center">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="font-display text-lg font-bold text-ink tabular-nums">{children}</dd>
    </div>
  );
}

function ActionsPlaceholder() {
  return (
    <div aria-hidden className="flex gap-2">
      <div className="skeleton h-10 w-28 rounded-action bg-ice" />
      <div className="skeleton h-10 w-24 rounded-action bg-ice" />
    </div>
  );
}
