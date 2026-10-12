import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getExploreData } from "@/lib/explore";
import { FEED_TAG, LISTINGS_TAG, getFeed } from "@/lib/profile/queries";
import type { ImageAsset } from "@/lib/profile/types";
import { getSearchCatalog } from "./catalog";
import { trendScore, type AdoptHit, type ArtistHit, type ArtistLite, type ServiceHit } from "./query";

/*
 * The trending page's data. No ranking model (the MVP brief): pieces rank by
 * likes weighed down by age, listings and artists by popularity (followers,
 * reviews). Cached for minutes; likes and listings invalidate it.
 */

export type TrendingPiece = {
  id: string;
  title: string;
  image: ImageAsset;
  artist: ArtistLite;
  likes: number;
  href: string;
  score: number;
};

export type Trending = {
  pieces: TrendingPiece[];
  artists: ArtistHit[];
  /** New artists with something listed: small studios get a shelf too. */
  newcomers: ArtistHit[];
  services: ServiceHit[];
  adoptables: AdoptHit[];
};

const DAY = 86_400_000;

export async function getTrending(): Promise<Trending> {
  "use cache";
  cacheLife("minutes");
  cacheTag("explore", FEED_TAG, LISTINGS_TAG, "search-index");

  const now = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const [explore, feed, catalog] = await Promise.all([getExploreData(), getFeed(), getSearchCatalog()]);
  const age = (iso: string) => (now - new Date(iso).getTime()) / DAY;

  const fromFeed: TrendingPiece[] = feed.flatMap(({ post, author }) =>
    post.media[0]
      ? [
          {
            id: post.id,
            title: post.body.split("\n")[0].slice(0, 60) || "Untitled",
            image: post.media[0],
            artist: { handle: author.handle, name: author.displayName, avatar: author.avatar, href: `/${author.handle}` },
            likes: post.likes,
            href: `/${author.handle}`,
            score: trendScore(post.likes, age(post.createdAt)),
          },
        ]
      : [],
  );
  const fromWall: TrendingPiece[] = explore.wall.map((piece) => ({
    id: piece.id,
    title: piece.title,
    image: piece.image,
    artist: piece.artist,
    likes: piece.likes,
    href: piece.href,
    score: trendScore(piece.likes, age(`${piece.postedAt}T12:00:00Z`)),
  }));

  // One spot per artwork (the same art can be a post and a gallery piece).
  const seen = new Set<string>();
  const pieces = [...fromFeed, ...fromWall]
    .toSorted((a, b) => b.score - a.score)
    .filter((p) => !seen.has(p.image.src) && seen.add(p.image.src))
    .slice(0, 12);

  const open = (a: ArtistHit) => a.commissions !== "closed";
  const byPopularity = <T extends { popularity: number }>(list: T[]) => list.toSorted((a, b) => b.popularity - a.popularity);
  const artists = byPopularity(catalog.artists.filter(open)).slice(0, 6);
  const featured = new Set(artists.map((a) => a.handle));
  const newcomers = catalog.artists
    .filter((a) => open(a) && !featured.has(a.handle) && age(a.createdAt) < 90)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return {
    pieces,
    artists,
    newcomers,
    services: byPopularity(catalog.services.filter((s) => s.status === "open" && (!s.slots || s.slots.taken < s.slots.total))).slice(0, 6),
    adoptables: byPopularity(catalog.adoptables.filter((a) => a.status === "available")).slice(0, 8),
  };
}
