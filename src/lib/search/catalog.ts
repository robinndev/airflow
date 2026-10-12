import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { poolSearchListings } from "@/lib/explore";
import { categoryLabel, priceFrom, styleLabel, type ServiceCategory, type StyleTag } from "@/lib/listings/catalog";
import { fetchAllAdoptables, fetchAllServices, fetchArtistAccounts } from "@/lib/listings/server";
import { summarizeServices } from "@/lib/listings/slots";
import { drawLabel } from "@/lib/profile/draws";
import { db } from "@/lib/profile/mock-db";
import { LISTINGS_TAG } from "@/lib/profile/queries";
import type { Adoptable, ArtistProfile, CommissionService, CommissionStatus } from "@/lib/profile/types";
import { withFollowCounts } from "@/lib/social";
import type { AdoptHit, ArtistHit, ArtistLite, SearchCatalog, ServiceHit } from "./query";

/*
 * Everything search can find, in one cached list: real accounts' services,
 * adoptables and profiles (Supabase), the demo artists (mock-db) and the
 * generated community (explore.ts). Filtering and ranking happen per request
 * over this list (query.ts). Fine into the thousands of listings; past that,
 * move the text match and filters into Postgres (full-text + trigram) and
 * keep query.ts for the rules.
 */

export const LABELS = {
  category: (id: ServiceCategory) => categoryLabel(id),
  style: (id: StyleTag) => styleLabel(id),
  draw: drawLabel,
};

const lite = (p: Pick<ArtistProfile, "handle" | "displayName" | "avatar" | "plan">): ArtistLite => ({
  handle: p.handle,
  name: p.displayName,
  avatar: p.avatar,
  isPro: p.plan === "pro",
  href: `/${p.handle}`,
});

function serviceHit(service: CommissionService, owner: ArtistProfile, status: CommissionStatus, slots: ServiceHit["slots"], createdAt: string): ServiceHit {
  const prices = service.packages?.map((p) => p.priceUsd) ?? [service.priceFromUsd];
  return {
    kind: "service",
    id: service.id,
    title: service.title,
    description: service.description,
    category: service.category,
    styles: service.styles ?? [],
    draws: owner.draws,
    artist: lite(owner),
    priceFromUsd: service.priceFromUsd,
    priceToUsd: Math.max(...prices),
    ...(service.packages && { packages: service.packages }),
    turnaround: service.turnaround,
    turnaroundDays: service.turnaroundDays,
    status,
    slots,
    examples: service.examples.slice(0, 3),
    createdAt,
    popularity: owner.stats.followers + (owner.commissions.rating?.count ?? 0) * 20,
    href: `/${owner.handle}/commissions#${service.id}`,
  };
}

function adoptHit(adopt: Adoptable, owner: ArtistProfile): AdoptHit {
  return {
    kind: "adoptable",
    id: adopt.id,
    name: adopt.name,
    species: adopt.species,
    description: adopt.description,
    draws: owner.draws,
    artist: lite(owner),
    priceUsd: adopt.priceUsd,
    status: adopt.status,
    image: adopt.images[0],
    createdAt: adopt.createdAt,
    popularity: owner.stats.followers,
    href: `/${owner.handle}/adoptables#${adopt.id}`,
  };
}

function artistHit(profile: ArtistProfile, services: CommissionService[], status: CommissionStatus, fromUsd: number | undefined): ArtistHit {
  const taking = services.filter((s) => (s.status ?? status) !== "closed");
  return {
    kind: "artist",
    handle: profile.handle,
    name: profile.displayName,
    headline: profile.headline,
    avatar: profile.avatar,
    banner: profile.banner,
    draws: profile.draws,
    styles: [...new Set(services.flatMap((s) => s.styles ?? []))],
    categories: [...new Set(services.map((s) => s.category))],
    commissions: status,
    ...(fromUsd ? { fromUsd } : {}),
    ...(taking.length && { turnaroundMaxDays: Math.min(...taking.map((s) => s.turnaroundDays.max)) }),
    followers: profile.stats.followers,
    isPro: profile.plan === "pro",
    createdAt: `${profile.joinedAt}T00:00:00Z`,
    popularity: profile.stats.followers,
    href: `/${profile.handle}`,
  };
}

export async function getSearchCatalog(): Promise<SearchCatalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag("search-index", LISTINGS_TAG);

  // Anchored to the hour, like Explore, so cached copies agree on "opens in".
  const now = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const [realServices, realAdopts, accounts, demoProfiles] = await Promise.all([
    fetchAllServices(),
    fetchAllAdoptables(),
    fetchArtistAccounts(),
    withFollowCounts(db.profiles),
  ]);
  const realProfiles = await withFollowCounts(accounts);
  const owners = new Map(realProfiles.map((p) => [p.handle, p]));
  const ownerOf = (p: ArtistProfile) => owners.get(p.handle) ?? p;

  // Demo artists: their services follow the artist's status and slots.
  const demoServices = db.services.flatMap((service) => {
    const owner = demoProfiles.find((p) => p.handle === service.ownerHandle);
    if (!owner) return [];
    const { status, slotsTotal, slotsTaken } = owner.commissions;
    const listed = `2026-${owner.handle === "mira" ? "09-20" : "09-02"}T12:00:00Z`;
    return [serviceHit(service, owner, status, slotsTotal ? { total: slotsTotal, taken: slotsTaken } : null, listed)];
  });
  const demoAdopts = db.adoptables.flatMap((adopt) => {
    const owner = demoProfiles.find((p) => p.handle === adopt.ownerHandle);
    return owner ? [adoptHit(adopt, owner)] : [];
  });
  const demoArtists = demoProfiles.map((p) => {
    const services = db.services.filter((s) => s.ownerHandle === p.handle);
    return artistHit(p, services, p.commissions.status, p.commissions.startingPriceUsd || undefined);
  });

  // Real accounts.
  const services = realServices.map(({ listing, owner }) =>
    serviceHit(listing, ownerOf(owner), listing.status ?? "closed", listing.slots ?? null, listing.createdAt ?? new Date(now).toISOString()),
  );
  const adoptables = realAdopts.map(({ listing, owner }) => adoptHit(listing, ownerOf(owner)));
  const servicesBy = new Map<string, CommissionService[]>();
  for (const { listing, owner } of realServices) servicesBy.set(owner.handle, [...(servicesBy.get(owner.handle) ?? []), listing]);
  const artists = realProfiles.map((p) => {
    const own = servicesBy.get(p.handle) ?? [];
    const summary = own.length ? summarizeServices(own) : null;
    return artistHit(p, own, summary?.status ?? "closed", summary ? priceFrom(own.filter((s) => s.status !== "closed").map((s) => ({ priceUsd: s.priceFromUsd }))) || undefined : undefined);
  });

  const pool = poolSearchListings(now);
  return {
    services: [...services, ...demoServices, ...pool.services],
    adoptables: [...adoptables, ...demoAdopts, ...pool.adoptables],
    artists: [...artists, ...demoArtists, ...pool.artists],
  };
}

/** For the drawer of filters: which labels exist (so the URL can't ask for anything else). */
export { SERVICE_CATEGORY_IDS, STYLE_IDS } from "@/lib/listings/catalog";
export { DRAW_TAGS } from "@/lib/profile/draws";
