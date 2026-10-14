import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toImageAsset } from "@/lib/art-storage";
import { getExploreData } from "@/lib/explore";
import { captionOf } from "@/lib/favorites/queries";
import { demoCharacters, demoPieces } from "@/lib/gallery/demo";
import { getGallery } from "@/lib/gallery/queries";
import { fetchRecentArtworks, fetchRecentCharacters, toPiece } from "@/lib/gallery/server";
import { characterHref } from "@/lib/gallery/types";
import { withoutHints } from "@/lib/images/variants";
import { categoryLabel, styleLabel } from "@/lib/listings/catalog";
import { fetchAllAdoptables, fetchAllServices } from "@/lib/listings/server";
import { moodsOf } from "@/lib/palette";
import { toArtistProfile } from "@/lib/profile/accounts";
import { demoPool, type PoolTheme } from "@/lib/profile/demo-images";
import { db } from "@/lib/profile/mock-db";
import { FEED_TAG, LISTINGS_TAG, getFeed } from "@/lib/profile/queries";
import type { ArtistProfile, CommissionService, ImageAsset } from "@/lib/profile/types";
import { WALL_TAG, type WallArtist, type WallEntry, type WallItem, type WallKind } from "./query";

/*
 * Everything Explore's wall can hang, in one cached list: real accounts'
 * gallery pieces, characters, posts, adoptables and commission examples
 * (Supabase), the demo artists (mock-db, gallery/demo.ts) and the generated
 * community (explore.ts). One tile per artwork: when the same picture is
 * several things, the most useful one keeps it (an adoptable, then a
 * character, a gallery piece, a commission example, a post). Filtering and
 * order happen per request (query.ts). Fine into the low thousands; past
 * that, page in Postgres (newest first, filters as columns) and keep
 * query.ts for the rules.
 */

const RANK: Record<WallKind, number> = { adoptable: 0, character: 1, piece: 2, commission: 3, post: 4 };

/** Search words for the generated community's themes. */
const THEME_WORDS: Record<PoolTheme, string> = {
  furry: "furry anthro fursona",
  creature: "creature fantasy",
  kemonomimi: "kemonomimi anime",
  chibi: "chibi cute",
  scenery: "background scenery landscape",
  pixel: "pixel art",
  traditional: "traditional watercolor",
};

/** Only what a tile needs from a picture: no focus or palette on avatars, no `remote` / `source` on demo art. */
const lean = ({ src, alt, width, height, palette, still }: ImageAsset): ImageAsset => ({
  src,
  alt,
  width,
  height,
  ...(palette && { palette: palette.slice(0, 5) }),
  ...(still && { still }),
});

const avatarOf = ({ src, alt, width, height, focus }: ImageAsset): ImageAsset => ({ src, alt, width, height, focus });

const artistOf = (p: Pick<ArtistProfile, "handle" | "displayName" | "avatar">): WallArtist => ({
  handle: p.handle,
  name: p.displayName,
  avatar: avatarOf(p.avatar),
  href: `/${p.handle}`,
});

/** Dates come as `YYYY-MM-DD` (demo data) or full ISO times. */
const isoOf = (date: string) => (date.length === 10 ? `${date}T12:00:00Z` : date);

/** What a service shows its buyers: open now, or with a waitlist. */
const listed = (service: CommissionService) => service.status === "open" || service.status === "waitlist";
const takingNow = (service: CommissionService) =>
  service.status === "open" && (!service.slots || service.slots.taken < service.slots.total);

export async function getWallCatalog(): Promise<{ entries: WallEntry[]; now: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(WALL_TAG, "explore", FEED_TAG, LISTINGS_TAG);

  // Anchored to the hour, like Explore's countdowns, so cached copies agree on ages.
  const now = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const quietly = <T,>(what: string, read: Promise<T[]>) =>
    read.catch((error) => {
      console.error(`Explore wall: couldn't load ${what}`, error);
      return [] as T[];
    });

  const [explore, feed, services, adoptables, artworks, characters, demoGalleries] = await Promise.all([
    getExploreData(),
    getFeed(),
    quietly("services", fetchAllServices()),
    quietly("adoptables", fetchAllAdoptables()),
    quietly("art", fetchRecentArtworks()),
    quietly("characters", fetchRecentCharacters()),
    Promise.all([...new Set(demoCharacters.map((c) => c.ownerHandle))].map((handle) => getGallery(handle))),
  ]);

  /* Who takes commissions now, from what. */
  const openFrom = new Map<string, number>();
  const offer = (handle: string, usd: number) => {
    if (usd > 0) openFrom.set(handle, Math.min(openFrom.get(handle) ?? Infinity, usd));
  };
  for (const studio of explore.studios) {
    if (studio.status !== "soon") offer(studio.artist.handle, Math.min(...studio.tiers.map((t) => t.priceUsd)));
  }
  for (const p of db.profiles) if (p.commissions.status === "open") offer(p.handle, p.commissions.startingPriceUsd);
  for (const { listing, owner } of services) if (takingNow(listing)) offer(owner.handle, listing.priceFromUsd);

  const candidates: WallEntry[] = [];
  const add = (item: Omit<WallItem, "moods" | "openFromUsd">, tags = "", text = "") => {
    if (item.images.length === 0) return;
    candidates.push({
      item: {
        ...item,
        images: item.images.map(lean),
        moods: moodsOf(item.images[0].palette),
        createdAt: isoOf(item.createdAt),
        ...(openFrom.has(item.artist.handle) && { openFromUsd: openFrom.get(item.artist.handle) }),
      },
      tags,
      text: text.slice(0, 400),
    });
  };

  /* The generated community and the demo artists' pieces (Explore's old wall: same ids, so saves still work). */
  const themes = new Map(demoPool.map((image) => [image.src, image.theme]));
  const wallBySrc = new Map(explore.wall.map((piece) => [piece.image.src, piece]));
  for (const piece of explore.wall) {
    const theme = themes.get(piece.image.src);
    const { handle, name, avatar, href } = piece.artist;
    const artist = { handle, name, avatar: avatarOf(avatar), href };
    add(
      {
        id: `${piece.adopt ? "adoptable" : "piece"}:${piece.id}`,
        kind: piece.adopt ? "adoptable" : "piece",
        title: piece.title,
        images: [piece.image],
        artist,
        href: piece.href,
        likes: piece.likes,
        createdAt: piece.postedAt,
        ...(piece.adopt && { priceUsd: piece.adopt.priceUsd, status: piece.adopt.status }),
        save: { kind: "art", id: piece.id },
      },
      theme ? THEME_WORDS[theme] : "",
      piece.image.alt,
    );
  }

  const demoProfiles = new Map(db.profiles.map((p) => [p.handle, p]));

  /* Demo gallery pieces (Kinako's), and the demo artists' characters. */
  for (const piece of demoPieces) {
    const owner = demoProfiles.get(piece.ownerHandle);
    if (!owner) continue;
    add(
      {
        id: `piece:${piece.id}`,
        kind: "piece",
        title: piece.title,
        images: [piece.image],
        artist: artistOf(owner),
        href: `/${owner.handle}/gallery`,
        likes: piece.likes,
        createdAt: piece.createdAt,
        save: { kind: "art", id: piece.id },
      },
      (piece.tags ?? []).join(" "),
      `${piece.description ?? ""} ${piece.image.alt}`,
    );
  }
  for (const gallery of demoGalleries) {
    for (const c of gallery.characters) {
      const owner = demoProfiles.get(c.ownerHandle);
      const others = c.art.map((a) => a.piece.image).filter((image) => image.src !== c.cover?.src);
      if (!owner || !c.cover) continue;
      add(
        {
          id: `character:${c.id}`,
          kind: "character",
          title: c.name,
          subtitle: c.species,
          images: [c.cover, ...others].slice(0, 8),
          artist: artistOf(owner),
          href: c.href,
          likes: c.art.find((a) => a.piece.image.src === c.cover?.src)?.piece.likes ?? 0,
          createdAt: c.createdAt,
          ...(c.adoptable && {
            priceUsd: c.adoptable.priceUsd,
            status: c.adoptable.status === "sold" ? "adopted" : c.adoptable.status,
          }),
          save: { kind: "character", id: c.id },
        },
        `${c.species} ${c.tags.join(" ")}`,
        `${c.tagline} ${c.story}`,
      );
    }
  }

  /* Demo listings: Kai's adoptables, the demo artists' services. */
  for (const adopt of db.adoptables) {
    const owner = demoProfiles.get(adopt.ownerHandle);
    const piece = adopt.images[0] && wallBySrc.get(adopt.images[0].src);
    if (!owner) continue;
    add(
      {
        id: `adoptable:${adopt.id}`,
        kind: "adoptable",
        title: adopt.name,
        subtitle: adopt.species,
        images: adopt.images,
        artist: artistOf(owner),
        href: `/${owner.handle}/adoptables#${adopt.id}`,
        likes: piece?.likes ?? 0,
        createdAt: adopt.createdAt,
        priceUsd: adopt.priceUsd,
        status: adopt.status === "sold" ? "adopted" : adopt.status,
        ...(piece && { save: { kind: "art" as const, id: piece.id } }),
      },
      adopt.species,
      adopt.description,
    );
  }
  for (const service of db.services) {
    const owner = demoProfiles.get(service.ownerHandle);
    if (!owner || owner.commissions.status === "closed") continue;
    add(
      {
        id: `commission:${service.id}`,
        kind: "commission",
        title: service.title,
        subtitle: categoryLabel(service.category),
        images: service.examples,
        artist: artistOf(owner),
        href: `/${owner.handle}/commissions#${service.id}`,
        likes: 0,
        createdAt: "2026-09-02",
        priceUsd: service.priceFromUsd,
        save: { kind: "service", id: service.id },
      },
      `${categoryLabel(service.category)} ${(service.styles ?? []).map(styleLabel).join(" ")}`,
      service.description,
    );
  }

  /* Real accounts. */
  const realArt = new Map(artworks.map((row) => [row.id, row]));
  for (const row of artworks) {
    const owner = toArtistProfile(row.owner);
    const piece = toPiece(row, owner.handle);
    add(
      {
        id: `piece:${piece.id}`,
        kind: "piece",
        title: piece.title,
        images: [piece.image],
        artist: artistOf(owner),
        href: `/${owner.handle}/gallery`,
        likes: 0,
        createdAt: piece.createdAt,
        save: { kind: "art", id: piece.id },
      },
      `${(piece.tags ?? []).join(" ")}${piece.kind === "commission" ? " commission" : ""}`,
      piece.description ?? "",
    );
  }
  for (const row of characters) {
    const owner = toArtistProfile(row.owner);
    const art = row.character_art.flatMap((a) => {
      const piece = realArt.get(a.artwork_id);
      return piece ? [toImageAsset(piece.image, piece.title)] : [];
    });
    const cover = row.cover ? toImageAsset(row.cover.image, row.cover.title) : art[0];
    if (!cover) continue;
    add(
      {
        id: `character:${row.id}`,
        kind: "character",
        title: row.name,
        ...(row.species && { subtitle: row.species }),
        images: [cover, ...art.filter((image) => image.src !== cover.src)].slice(0, 8),
        artist: artistOf(owner),
        href: characterHref(owner.handle, row.slug),
        likes: 0,
        createdAt: row.created_at,
        save: { kind: "character", id: row.id },
      },
      `${row.species} ${row.tags.join(" ")}`,
    );
  }
  for (const { listing, owner } of adoptables) {
    add(
      {
        id: `adoptable:${listing.id}`,
        kind: "adoptable",
        title: listing.name,
        ...(listing.species && { subtitle: listing.species }),
        images: listing.images,
        artist: artistOf(owner),
        href: `/${owner.handle}/adoptables#${listing.id}`,
        likes: 0,
        createdAt: listing.createdAt,
        priceUsd: listing.priceUsd,
        status: listing.status === "sold" ? "adopted" : listing.status,
      },
      listing.species,
      listing.description,
    );
  }
  for (const { listing, owner } of services) {
    if (!listed(listing)) continue;
    add(
      {
        id: `commission:${listing.id}`,
        kind: "commission",
        title: listing.title,
        subtitle: categoryLabel(listing.category),
        images: listing.examples,
        artist: artistOf(owner),
        href: `/${owner.handle}/commissions#${listing.id}`,
        likes: 0,
        createdAt: listing.createdAt ?? new Date(now).toISOString(),
        priceUsd: listing.priceFromUsd,
      },
      `${categoryLabel(listing.category)} ${(listing.styles ?? []).map(styleLabel).join(" ")} ${(listing.packages ?? []).map((p) => p.label).join(" ")}`,
      listing.description,
    );
  }

  /* Posts with pictures (demo and real): the feed's own list. */
  for (const { post, author } of feed) {
    if (post.media.length === 0) continue;
    add(
      {
        id: `post:${post.id}`,
        kind: "post",
        title: captionOf(post.body) || "Untitled",
        images: post.media,
        artist: artistOf(author),
        href: `/${author.handle}#${post.id}`,
        likes: post.likes,
        createdAt: post.createdAt,
        ...((post.kind === "wip" || post.kind === "sketch") && { stage: post.kind }),
        save: { kind: "post", id: post.id },
      },
      post.kind,
      post.body,
    );
  }

  /* One tile per artwork, kept by the most useful thing it is. */
  const taken = new Set<string>();
  const entries = candidates
    .toSorted((a, b) => RANK[a.item.kind] - RANK[b.item.kind])
    .filter(({ item }) => {
      const key = withoutHints(item.images[0].src);
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });

  return { entries, now };
}
