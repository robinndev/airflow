import { configured } from "@/lib/profile/accounts";
import { isDemoPostId, isRealPostId } from "@/lib/profile/conversation";
import { db } from "@/lib/profile/mock-db";
import type { ArtistProfile, Post } from "@/lib/profile/types";
import { createSupabasePublic, createSupabaseServer } from "@/lib/supabase/server";

/*
 * Follows and likes (supabase/migrations/*_follows_and_likes.sql). Counts are
 * public, so they're read with the cookie-less client and work inside
 * `"use cache"`. Who follows whom is public too; who liked what is private,
 * so the viewer's own likes are read with their session.
 *
 * Demo artists and posts (mock-db.ts) keep their made-up numbers, and real
 * follows and likes add to them. A database without the tables yet reads as
 * zero everywhere, so a deployment ahead of its migration still renders.
 */

type FollowCounts = { followers: number; following: number };

/** Real follows for a batch of handles. */
async function fetchFollowCounts(handles: string[]): Promise<Map<string, FollowCounts>> {
  const counts = new Map<string, FollowCounts>();
  if (!configured() || handles.length === 0) return counts;
  const { data, error } = await createSupabasePublic().rpc("follow_counts", { handles });
  if (error) {
    console.error(`Couldn't count follows: ${error.message}`);
    return counts;
  }
  for (const row of (data ?? []) as { handle: string; followers: number; following: number }[]) counts.set(row.handle, { followers: row.followers, following: row.following });
  return counts;
}

/** Profiles with real follows added to their stats (demo artists keep their made-up base). */
export async function withFollowCounts<T extends ArtistProfile>(profiles: T[]): Promise<T[]> {
  const counts = await fetchFollowCounts(profiles.map((p) => p.handle));
  return profiles.map((p) => {
    const real = counts.get(p.handle);
    if (!real) return p;
    return {
      ...p,
      stats: {
        ...p.stats,
        followers: p.stats.followers + real.followers,
        following: p.stats.following + real.following,
      },
    };
  });
}

/** Someone's follower count right now (uncached: what a follow button shows after it's pressed). */
export async function countFollowers(handle: string): Promise<number> {
  const base = db.profiles.find((p) => p.handle === handle)?.stats.followers ?? 0;
  return base + ((await fetchFollowCounts([handle])).get(handle)?.followers ?? 0);
}

/** Real likes for a batch of posts, by post id. */
export async function fetchLikeCounts(postIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const real = postIds.filter(isRealPostId);
  const demo = postIds.filter(isDemoPostId);
  if (!configured() || real.length + demo.length === 0) return counts;
  const { data, error } = await createSupabasePublic().rpc("post_like_counts", { post_ids: real, demo_post_ids: demo });
  if (error) {
    console.error(`Couldn't count likes: ${error.message}`);
    return counts;
  }
  for (const row of (data ?? []) as { post_id: string | null; demo_post_id: string | null; likes: number }[]) counts.set((row.post_id ?? row.demo_post_id)!, row.likes);
  return counts;
}

/** Posts with real likes added to their count (demo posts keep their made-up base). */
export async function withLikeCounts(posts: Post[]): Promise<Post[]> {
  const counts = await fetchLikeCounts(posts.map((p) => p.id));
  return posts.map((p) => (counts.has(p.id) ? { ...p, likes: p.likes + counts.get(p.id)! } : p));
}

/** A post's like count right now (uncached: what the heart shows after it's pressed). */
export async function countLikes(postId: string): Promise<number> {
  const base = db.posts.find((p) => p.id === postId)?.likes ?? 0;
  return base + ((await fetchLikeCounts([postId])).get(postId) ?? 0);
}

type FollowRow = { demo_handle: string | null; followee: { handle: string } | null };

/** Handles someone follows, newest first (up to 5000, the cap). */
export async function fetchFollowing(userId: string): Promise<string[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("follows")
    .select("demo_handle, followee:profiles!follows_followee_id_fkey(handle)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<FollowRow[]>();
  if (error) {
    console.error(`Couldn't load follows: ${error.message}`);
    return [];
  }
  return data.flatMap((row) => {
    const handle = row.demo_handle ?? row.followee?.handle;
    return handle ? [handle] : [];
  });
}

/** Which of these posts the signed-in viewer liked. Likes are private: read as the viewer. */
export async function fetchLikedPostIds(userId: string, postIds: string[]): Promise<string[]> {
  const real = postIds.filter(isRealPostId);
  const demo = postIds.filter(isDemoPostId);
  if (!configured() || real.length + demo.length === 0) return [];
  const parts = [
    real.length && `post_id.in.(${real.join(",")})`,
    demo.length && `demo_post_id.in.(${demo.join(",")})`,
  ].filter(Boolean);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id, demo_post_id")
    .eq("user_id", userId)
    .or(parts.join(","))
    .returns<{ post_id: string | null; demo_post_id: string | null }[]>();
  if (error) {
    console.error(`Couldn't load likes: ${error.message}`);
    return [];
  }
  return data.map((row) => (row.post_id ?? row.demo_post_id)!);
}

/** Whether someone follows this artist (the profile's own Follow button starts from it). */
export async function isFollowing(userId: string, profile: Pick<ArtistProfile, "id" | "handle">): Promise<boolean> {
  if (!configured()) return false;
  const query = createSupabasePublic().from("follows").select("id").eq("follower_id", userId).limit(1);
  const { data, error } = db.profiles.some((p) => p.handle === profile.handle)
    ? await query.eq("demo_handle", profile.handle)
    : await query.eq("followee_id", profile.id);
  if (error) console.error(`Couldn't check a follow: ${error.message}`);
  return Boolean(data?.length);
}
