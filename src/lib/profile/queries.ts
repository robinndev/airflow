import { cacheLife, cacheTag } from "next/cache";
import {
  fetchAccount,
  fetchHandleForUser,
  fetchPostsByHandle,
  fetchPostsByIds,
  fetchRecentPosts,
} from "./accounts";
import { fetchConversations, isRealPostId } from "./conversation";
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
export const userTag = (userId: string) => `user:${userId}`;
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
      slotsTotal: number;
    }
  | { type: "adoptable"; artwork: Artwork };

export type FeedEntry = {
  post: Post;
  author: PostAuthor;
  /** The author's commission status, so the feed can point buyers at open studios. */
  studio: { status: ArtistProfile["commissions"]["status"]; slotsLeft: number };
  embed?: ResolvedEmbed;
  quote?: { post: Post; author: PostAuthor };
};

export function normalizeHandle(handle: string) {
  return decodeURIComponent(handle).replace(/^@/, "").toLowerCase();
}

/** Demo artists first (mock-db), then real accounts. */
export async function getProfile(handle: string): Promise<ArtistProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(profileTag(handle));

  return db.profiles.find((p) => p.handle === handle) ?? (await fetchAccount(handle));
}

/** The handle of a signed-in account (handles never change). */
export async function getHandleForUser(userId: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(userTag(userId));

  return fetchHandleForUser(userId);
}

/** Pinned first, then newest first. */
export async function getPosts(handle: string): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(postsTag(handle));

  // Demo artists' posts live in mock-db; real accounts' in Supabase.
  if (!db.profiles.some((p) => p.handle === handle)) return hydratePosts(await fetchPostsByHandle(handle));

  return hydratePosts(
    db.posts
      .filter((p) => p.authorHandle === handle)
      .toSorted(
        (a, b) =>
          Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
  );
}

const demoAuthor = (handle: string): PostAuthor | undefined => {
  const p = db.profiles.find((profile) => profile.handle === handle);
  return p && { handle: p.handle, displayName: p.displayName, avatar: p.avatar, plan: p.plan };
};

/**
 * Fills in what doesn't live on the post itself: the original a repost pins
 * (fetched when it isn't in `known`), comment and repost counts, and the
 * newest comment. Call it inside a cached read; comment and repost actions
 * invalidate the feed and the authors' post tags.
 */
async function hydratePosts(posts: Post[], known: Post[] = posts, authors = new Map<string, PostAuthor>()): Promise<Post[]> {
  const byId = new Map([...db.posts, ...known].map((p) => [p.id, p]));
  const missing = [...new Set(posts.flatMap((p) => (p.quotePostId && !byId.has(p.quotePostId) ? [p.quotePostId] : [])))];
  const extra = await fetchPostsByIds(missing.filter(isRealPostId));
  for (const p of extra.posts) byId.set(p.id, p);
  for (const a of extra.authors) authors.set(a.handle, toPostAuthorFromProfile(a));

  const conversations = await fetchConversations(posts);
  return posts.map((post) => {
    const original = post.quotePostId ? byId.get(post.quotePostId) : undefined;
    const originalAuthor = original && (demoAuthor(original.authorHandle) ?? authors.get(original.authorHandle));
    const talk = conversations.get(post.id);
    return {
      ...post,
      quoted: original && originalAuthor ? { post: original, author: originalAuthor } : undefined,
      comments: talk?.comments ?? 0,
      reposts: talk?.reposts ?? 0,
      latestComment: talk?.latest,
    };
  });
}

function toPostAuthorFromProfile(p: ArtistProfile): PostAuthor {
  return { handle: p.handle, displayName: p.displayName, avatar: p.avatar, plan: p.plan };
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
  // Real accounts' posts join the demo ones.
  const recent = await fetchRecentPosts();
  for (const author of recent.authors) profiles.set(author.handle, author);
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
      return { type: "service", service, status, slotsTotal, slotsLeft: Math.max(0, slotsTotal - slotsTaken) };
    }
    if (post.embed?.type === "adoptable") {
      const { artworkId } = post.embed;
      const artwork = db.artworks.find((a) => a.id === artworkId);
      return artwork && { type: "adoptable", artwork };
    }
    return undefined;
  };

  const all = [...db.posts, ...recent.posts].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const authors = new Map(recent.authors.map((a) => [a.handle, toPostAuthorFromProfile(a)]));
  const posts = await hydratePosts(all, all, authors);

  return posts.flatMap((post): FeedEntry[] => {
    const author = toAuthor(post.authorHandle);
    const commissions = profiles.get(post.authorHandle)?.commissions;
    if (!author || !commissions) return [];
    return [
      {
        post: { ...post, pinned: false },
        author,
        studio: {
          status: commissions.status,
          slotsLeft: Math.max(0, commissions.slotsTotal - commissions.slotsTaken),
        },
        embed: resolveEmbed(post),
        quote: post.quoted,
      },
    ];
  });
}

export async function getAllProfiles(): Promise<ArtistProfile[]> {
  "use cache";
  cacheLife("hours");
  return db.profiles;
}

/** Profiles prerendered at build time; everything else gets the App Shell. */
export async function getFeaturedHandles(): Promise<string[]> {
  "use cache";
  cacheLife("days");

  return db.profiles.map((p) => p.handle);
}
