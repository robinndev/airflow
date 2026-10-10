import { cacheLife, cacheTag } from "next/cache";
import { db } from "./mock-db";
import type { ArtistProfile, Post } from "./types";

export const profileTag = (handle: string) => `profile:${handle}`;
export const postsTag = (handle: string) => `posts:${handle}`;

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

/** Profiles prerendered at build time; everything else gets the App Shell. */
export async function getFeaturedHandles(): Promise<string[]> {
  "use cache";
  cacheLife("days");

  return db.profiles.map((p) => p.handle);
}
