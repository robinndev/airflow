import Image from "next/image";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ProStar } from "@/components/ui/pro-badge";
import { HEADER_SENTINEL_ID } from "@/components/site/header-shell";
import { formatCompact, formatMonthYear } from "@/lib/format";
import type { ArtistProfile, ResolvedAppearance } from "@/lib/profile/types";
import { AvailabilityBadge } from "./availability-badge";
import { CommissionStatusPill } from "./commission-status-pill";
import { OwnerImageControls, ProfileActions } from "./profile-actions";

type ProfileHeroProps = {
  profile: ArtistProfile;
  appearance: ResolvedAppearance;
};

export function ProfileHero({ profile, appearance }: ProfileHeroProps) {
  return (
    <section aria-labelledby="profile-name" className="relative">
      {/*
        Full-bleed banner that sits under the floating header (-mt-16).
        It's the LCP element, so it loads eagerly with high priority.
      */}
      <div className="relative -mt-16 h-[clamp(15rem,30vw,24rem)] overflow-hidden bg-ice">
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
            <div className="group/avatar relative -mt-14 w-fit shrink-0 sm:-mt-20">
              <Avatar
                image={profile.avatar}
                size={152}
                preload
                className="size-28 shadow-lift ring-[5px] ring-surface sm:size-38"
              />
              {profile.plan === "pro" && <ProStar />}
              <Suspense>
                <OwnerImageControls handle={profile.handle} slot="avatar" />
              </Suspense>
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1
                  id="profile-name"
                  className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[2rem]"
                >
                  {profile.displayName}
                </h1>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.9375rem] text-muted">
                <span className="font-medium text-ink/80">@{profile.handle}</span>
                {profile.pronouns && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{profile.pronouns}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:pb-1">
            <Suspense fallback={<ActionsPlaceholder />}>
              <ProfileActions handle={profile.handle} />
            </Suspense>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="font-display text-[1.0625rem] font-semibold text-ink">
              {profile.headline}
            </p>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink/80">{profile.bio}</p>
            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <li>
                {/* Availability is the headline status; commission details live in the sidebar. */}
                {profile.availability ? (
                  <AvailabilityBadge handle={profile.handle} note={profile.availability.note} />
                ) : (
                  <CommissionStatusPill status={profile.commissions.status} />
                )}
              </li>
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

          <dl className="flex gap-1 rounded-card border border-border bg-surface p-1.5 shadow-soft">
            <Stat label="Followers" value={profile.stats.followers} />
            <Stat label="Following" value={profile.stats.following} />
            <Stat label="Artworks" value={profile.stats.artworks} />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-24 flex-col-reverse items-center rounded-input px-4 py-2 text-center">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="font-display text-lg font-bold text-ink tabular-nums">
        {formatCompact(value)}
      </dd>
    </div>
  );
}

function ActionsPlaceholder() {
  return (
    <div aria-hidden className="flex gap-2">
      <div className="h-10 w-28 animate-pulse rounded-action bg-ice" />
      <div className="h-10 w-24 animate-pulse rounded-action bg-ice" />
    </div>
  );
}
