import { cacheLife, cacheTag } from "next/cache";
import { db } from "./mock-db";
import type {
  ArtistProfile,
  Artwork,
  CommissionService,
  Post,
  PostAuthor,
  Review,
} from "./types";

export const profileTag = (handle: string) => `profile:${handle}`;
export const postsTag = (handle: string) => `posts:${handle}`;
export const artworksTag = (handle: string) => `artworks:${handle}`;
export const servicesTag = (handle: string) => `services:${handle}`;
export const FEED_TAG = "feed";

export type ResolvedEmbed =
  | {
      type: "service";
      service: CommissionService;
      status: ArtistProfile["commissions"]["status"];
      slotsLeft: number;
    }
  | { type: "adoptable"; artwork: Artwork };

export type FeedEntry = {
  post: Post;
  author: PostAuthor;
  embed?: ResolvedEmbed;
  quote?: { post: Post; author: PostAuthor };
  commentAuthor?: PostAuthor;
};

export function normalizeHandle(handle: string) {
  return decodeURIComponent(handle).replace(/^@/, "").toLowerCase();
}

export async function getProfile(handle: string): Promise<ArtistProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(profileTag(handle));

  return db.profiles.find((p) => p.handle === handle) ?? null;
}

/** Pinned first, then newest first. */
export async function getPosts(handle: string): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(postsTag(handle));

  return db.posts
    .filter((p) => p.authorHandle === handle)
    .toSorted(
      (a, b) =>
        Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

/** Newest first. */
export async function getArtworks(handle: string): Promise<Artwork[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(artworksTag(handle));

  return db.artworks
    .filter((a) => a.ownerHandle === handle)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Cheapest first. */
export async function getServices(handle: string): Promise<CommissionService[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(servicesTag(handle));

  return db.services
    .filter((s) => s.ownerHandle === handle)
    .toSorted((a, b) => a.priceFromUsd - b.priceFromUsd);
}

/** Newest first. */
export async function getReviews(handle: string): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(servicesTag(handle));

  return db.reviews
    .filter((r) => r.artistHandle === handle)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Home feed: newest posts from everyone. Pinning only applies on profiles.
 * Will become ranked + paginated (cursor) once there's real data.
 */
export async function getFeed(): Promise<FeedEntry[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(FEED_TAG);

  const profiles = new Map(db.profiles.map((p) => [p.handle, p]));
  const toAuthor = (handle: string): PostAuthor | undefined => {
    const p = profiles.get(handle);
    return p && { handle: p.handle, displayName: p.displayName, avatar: p.avatar, plan: p.plan };
  };

  const resolveEmbed = (post: Post): ResolvedEmbed | undefined => {
    if (post.embed?.type === "service") {
      const { serviceId } = post.embed;
      const service = db.services.find((s) => s.id === serviceId);
      const owner = service && profiles.get(service.ownerHandle);
      if (!service || !owner) return undefined;
      const { status, slotsTotal, slotsTaken } = owner.commissions;
      return { type: "service", service, status, slotsLeft: Math.max(0, slotsTotal - slotsTaken) };
    }
    if (post.embed?.type === "adoptable") {
      const { artworkId } = post.embed;
      const artwork = db.artworks.find((a) => a.id === artworkId);
      return artwork && { type: "adoptable", artwork };
    }
    return undefined;
  };

  return db.posts
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((post): FeedEntry[] => {
      const author = toAuthor(post.authorHandle);
      if (!author) return [];
      const quoted = post.quotePostId ? db.posts.find((p) => p.id === post.quotePostId) : undefined;
      const quotedAuthor = quoted && toAuthor(quoted.authorHandle);
      return [
        {
          post: { ...post, pinned: false },
          author,
          embed: resolveEmbed(post),
          quote: quoted && quotedAuthor ? { post: quoted, author: quotedAuthor } : undefined,
          commentAuthor: post.topComment && toAuthor(post.topComment.author),
        },
      ];
    });
}

export async function getAllProfiles(): Promise<ArtistProfile[]> {
  "use cache";
  cacheLife("hours");
  return db.profiles;
}

/** Open services across artists, for the feed's sidebar. */
export async function getOpenServices(limit = 3) {
  "use cache";
  cacheLife("hours");
  const open = new Set(
    db.profiles.filter((p) => p.commissions.status === "open").map((p) => p.handle),
  );
  return db.services
    .filter((s) => open.has(s.ownerHandle))
    .toSorted((a, b) => Number(b.popular ?? false) - Number(a.popular ?? false))
    .slice(0, limit);
}

/** Profiles prerendered at build time; everything else gets the App Shell. */
export async function getFeaturedHandles(): Promise<string[]> {
  "use cache";
  cacheLife("days");

  return db.profiles.map((p) => p.handle);
}
