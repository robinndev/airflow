"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cleanFollowQuery, isFollowList, type FollowList, type FollowPage } from "@/lib/follows/list";
import { fetchFollowersAmong, fetchFollowList } from "@/lib/follows/server";
import { fetchPostInfo, postRef } from "@/lib/profile/conversation";
import { db } from "@/lib/profile/mock-db";
import { FEED_TAG, normalizeHandle, postsTag, profileTag } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { countFollowers, countLikes, fetchFollowing, fetchLikedPostIds } from "@/lib/social";
import { createSupabasePublic, createSupabaseServer } from "@/lib/supabase/server";

/*
 * Following artists and liking posts, written as the viewer under row level
 * security. Buttons keep the viewer's own state on the client
 * (src/components/social/store.ts); each write answers with the fresh count
 * and invalidates the pages that show it.
 */

export type CountResult = { ok: true; count: number } | { ok: false; error: string; signIn?: true };

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";
const HANDLE = /^[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$/;

/** Every handle the viewer follows, so follow buttons on static pages show their state. */
export async function loadFollowing(): Promise<string[]> {
  const viewer = await getViewer();
  return viewer ? fetchFollowing(viewer.id) : [];
}

/** Which of these posts the viewer liked (the like buttons on the page ask in one batch). */
export async function loadLikes(postIds: string[]): Promise<string[]> {
  const viewer = await getViewer();
  const ids = z.array(z.string().max(64)).max(200).safeParse(postIds);
  if (!viewer || !ids.success) return [];
  return fetchLikedPostIds(viewer.id, ids.data);
}

/**
 * More of someone's followers or following, a search through them, or only
 * the ones who also follow the viewer (`mutual`).
 */
export async function loadFollowList(
  rawHandle: string,
  list: FollowList,
  options: { offset?: number; query?: string; mutual?: boolean } = {},
): Promise<FollowPage> {
  const handle = typeof rawHandle === "string" ? normalizeHandle(rawHandle) : "";
  const offset = z.number().int().min(0).max(100_000).safeParse(options.offset ?? 0);
  if (!HANDLE.test(handle) || !isFollowList(list) || !offset.success) return { people: [], total: 0 };
  const viewer = options.mutual ? await getViewer() : null;
  if (options.mutual && !viewer) return { people: [], total: 0 };
  return fetchFollowList(handle, list, { offset: offset.data, query: cleanFollowQuery(options.query), follows: viewer?.id });
}

/** Which of these people follow the viewer (cards on a list ask in one batch). */
export async function loadFollowsYou(handles: string[]): Promise<string[]> {
  const viewer = await getViewer();
  const parsed = z.array(z.string().regex(HANDLE)).max(200).safeParse(handles);
  if (!viewer || !parsed.success) return [];
  return fetchFollowersAmong(viewer.id, parsed.data);
}

/** Follows or unfollows an artist; answers with their follower count. */
export async function setFollow(rawHandle: string, follow: boolean): Promise<CountResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to follow artists.", signIn: true };
  const handle = typeof rawHandle === "string" ? normalizeHandle(rawHandle) : "";
  if (!HANDLE.test(handle)) return { ok: false, error: "That artist isn't here." };
  if (handle === viewer.handle) return { ok: false, error: "That's you!" };

  let target: Record<"followee_id" | "demo_handle", string | null>;
  if (db.profiles.some((p) => p.handle === handle)) target = { followee_id: null, demo_handle: handle };
  else {
    const { data } = await createSupabasePublic().from("profiles").select("id").eq("handle", handle).maybeSingle();
    if (!data) return { ok: false, error: "That artist isn't here anymore." };
    target = { followee_id: data.id, demo_handle: null };
  }

  const supabase = await createSupabaseServer();
  if (follow) {
    const { error } = await supabase.from("follows").insert(target);
    // Already following (another tab, a double click): that's the outcome we wanted.
    if (error?.code === CHECK_VIOLATION) return { ok: false, error: error.message };
    if (error && error.code !== UNIQUE_VIOLATION) return { ok: false, error: "Couldn't follow. Try again in a moment." };
  } else {
    const { error } = target.demo_handle
      ? await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("demo_handle", target.demo_handle)
      : await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("followee_id", target.followee_id!);
    if (error) return { ok: false, error: "Couldn't unfollow. Try again in a moment." };
  }

  // Their followers and your following.
  updateTag(profileTag(handle));
  updateTag(profileTag(viewer.handle));
  return { ok: true, count: await countFollowers(handle) };
}

/** Likes or unlikes a post; answers with its like count. */
export async function setLike(postId: string, like: boolean): Promise<CountResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to like posts.", signIn: true };
  const ref = typeof postId === "string" ? postRef(postId) : null;
  const info = ref && (await fetchPostInfo(postId));
  if (!ref || !info) return { ok: false, error: "That post isn't there anymore." };

  const supabase = await createSupabaseServer();
  if (like) {
    const { error } = await supabase.from("post_likes").insert({ ...ref });
    if (error?.code === FOREIGN_KEY_VIOLATION) return { ok: false, error: "That post isn't there anymore." };
    if (error && error.code !== UNIQUE_VIOLATION) return { ok: false, error: "Couldn't like it. Try again in a moment." };
  } else {
    const [column, value] = Object.entries(ref)[0];
    const { error } = await supabase.from("post_likes").delete().eq("user_id", viewer.id).eq(column, value);
    if (error) return { ok: false, error: "Couldn't take the like back. Try again in a moment." };
  }

  // Like counts show on the feed and on the author's profile.
  updateTag(FEED_TAG);
  updateTag(postsTag(info.authorHandle));
  return { ok: true, count: await countLikes(postId) };
}
