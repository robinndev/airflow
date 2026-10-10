import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { createSupabasePublic } from "@/lib/supabase/server";
import { defaultArt } from "./default-art";
import type { ArtistProfile, Post, PostKind } from "./types";

/*
 * Real accounts (Supabase `profiles`, `posts`) shown alongside the demo
 * artists in mock-db.ts. A brand-new account is a blank page: no art,
 * commissions closed, generated avatar and banner until they upload their own.
 * Callers cache these reads (`"use cache"`); profiles are public, so no
 * cookies are involved.
 */

type AccountRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  created_at: string;
  avatar: StoredImage | null;
  banner: StoredImage | null;
  plan: "free" | "flow_plus";
};

type PostRow = {
  id: string;
  kind: PostKind;
  body: string;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  image_palette: string[] | null;
  created_at: string;
  author: AccountRow;
};

const COLUMNS = "id, handle, display_name, bio, created_at, avatar, banner, plan";
const POST_COLUMNS = `id, kind, body, image_path, image_width, image_height, image_palette, created_at, author:profiles!inner(${COLUMNS})`;

/** Lets demo-only setups (no Supabase keys yet) keep working. */
const configured = () => Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);

export async function fetchAccount(handle: string): Promise<ArtistProfile | null> {
  if (!configured()) return null;
  const { data, error } = await createSupabasePublic().from("profiles").select(COLUMNS).eq("handle", handle).maybeSingle();
  if (error) throw new Error(`Couldn't load @${handle}: ${error.message}`);
  return data ? toArtistProfile(data) : null;
}

export async function fetchAccounts(handles: string[]): Promise<ArtistProfile[]> {
  if (!configured() || handles.length === 0) return [];
  const { data, error } = await createSupabasePublic().from("profiles").select(COLUMNS).in("handle", handles);
  if (error) throw new Error(`Couldn't load profiles: ${error.message}`);
  return data.map(toArtistProfile);
}

export async function fetchHandleForUser(userId: string): Promise<string | null> {
  if (!configured()) return null;
  const { data, error } = await createSupabasePublic().from("profiles").select("handle").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
  return data?.handle ?? null;
}

/** Read fresh (uncached): plans change from the team's script, outside the app's cache tags. */
export async function fetchPlanForUser(userId: string): Promise<"free" | "flow_plus"> {
  if (!configured()) return "free";
  const { data } = await createSupabasePublic().from("profiles").select("plan").eq("id", userId).maybeSingle();
  return data?.plan === "flow_plus" ? "flow_plus" : "free";
}

export async function isHandleRegistered(handle: string): Promise<boolean> {
  if (!configured()) return false;
  const { count, error } = await createSupabasePublic()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("handle", handle);
  if (error) throw new Error(`Couldn't check @${handle}: ${error.message}`);
  return (count ?? 0) > 0;
}

/** A real account's posts, newest first. */
export async function fetchPostsByHandle(handle: string): Promise<Post[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("posts")
    .select(POST_COLUMNS)
    .eq("author.handle", handle)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<PostRow[]>();
  if (error) throw new Error(`Couldn't load @${handle}'s posts: ${error.message}`);
  return data.map(toPost);
}

/** Newest posts from every real account, with their authors (for the home feed). */
export async function fetchRecentPosts(limit = 60): Promise<{ posts: Post[]; authors: ArtistProfile[] }> {
  if (!configured()) return { posts: [], authors: [] };
  const { data, error } = await createSupabasePublic()
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PostRow[]>();
  if (error) throw new Error(`Couldn't load the feed: ${error.message}`);
  const authors = new Map(data.map((row) => [row.author.handle, toArtistProfile(row.author)]));
  return { posts: data.map(toPost), authors: [...authors.values()] };
}

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorHandle: row.author.handle,
    kind: row.kind,
    body: row.body,
    media:
      row.image_path && row.image_width && row.image_height
        ? [
            toImageAsset(
              { path: row.image_path, width: row.image_width, height: row.image_height, palette: row.image_palette },
              `Artwork shared by @${row.author.handle}`,
            ),
          ]
        : [],
    createdAt: row.created_at,
    likes: 0,
    comments: 0,
  };
}

function toArtistProfile(row: AccountRow): ArtistProfile {
  const art = defaultArt(row.handle, row.display_name);
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    headline: "New on Artiflow",
    bio: row.bio,
    joinedAt: row.created_at.slice(0, 10),
    // Flow+ is still `pro` in the app's types (see docs/roadmap.md).
    plan: row.plan === "flow_plus" ? "pro" : "free",
    avatar: row.avatar ? toImageAsset(row.avatar, row.display_name) : art.avatar,
    banner: row.banner ? toImageAsset(row.banner, "") : art.banner,
    stats: { followers: 0, following: 0, artworks: 0 },
    commissions: { status: "closed", slotsTotal: 0, slotsTaken: 0, startingPriceUsd: 0, turnaround: "", types: [] },
    gallery: { total: 0, preview: [] },
    links: [],
    appearance: { accent: art.accent, bannerFocusY: 50 },
  };
}
