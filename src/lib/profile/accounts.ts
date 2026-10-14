import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { readBoard } from "@/lib/customization/about";
import { readCustomization } from "@/lib/customization/model";
import { normalizeUrl, toSocialLink } from "./links";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { createSupabasePublic } from "@/lib/supabase/server";
import { defaultArt } from "./default-art";
import { cleanDraws } from "./draws";
import type { ArtistProfile, Post, PostAuthor, PostKind } from "./types";

/*
 * Real accounts (Supabase `profiles`, `posts`) shown alongside the demo
 * artists in mock-db.ts. A brand-new account is a blank page: no art,
 * commissions closed, generated avatar and banner until they upload their own.
 * Callers cache these reads (`"use cache"`); profiles are public, so no
 * cookies are involved.
 */

export type AccountRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  created_at: string;
  avatar: StoredImage | null;
  banner: StoredImage | null;
  plan: "free" | "flow_plus";
  /** Only on full profile reads (PROFILE_COLUMN_SETS), not on post/comment authors. */
  customization?: unknown;
  about?: unknown;
  headline?: string;
  pronouns?: string;
  location?: string;
  links?: { url: string; label?: string }[];
  draws?: string[];
  /** Only on full profile reads: when they got artist access (null: a collector), and whose code it was. */
  artist_since?: string | null;
  inviter?: { handle: string } | null;
};

type PostRow = {
  id: string;
  kind: PostKind;
  body: string;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  image_palette: string[] | null;
  /** Up to four images. Older rows only have the image_* columns. */
  images: StoredImage[] | null;
  quote_post_id: string | null;
  quote_demo_post_id: string | null;
  /** What the post celebrates (the Artist Pass), drawn by the app. */
  milestone?: { kind: "artist_pass"; number?: number; since?: string; invitedBy?: string } | null;
  created_at: string;
  author: AccountRow;
};

export const ACCOUNT_COLUMNS = "id, handle, display_name, bio, created_at, avatar, banner, plan";
const COLUMNS = ACCOUNT_COLUMNS;
/**
 * A whole profile page: also its details, customization and About board (the
 * board can be large, so none of this is joined into posts). Newest first:
 * a database that predates a migration (Postgres 42703, undefined column)
 * falls back to the next set instead of failing the page.
 */
const PROFILE_COLUMN_SETS = [
  `${ACCOUNT_COLUMNS}, customization, about, headline, pronouns, location, links, draws, artist_since, inviter:invited_by(handle)`,
  `${ACCOUNT_COLUMNS}, customization, about, headline, pronouns, location, links, draws`,
  `${ACCOUNT_COLUMNS}, customization, about, headline, pronouns, location, links`,
  `${ACCOUNT_COLUMNS}, customization, about`,
  COLUMNS,
];
const MISSING_COLUMN = "42703";

async function withProfileColumns<T>(
  run: (columns: string) => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
) {
  for (const columns of PROFILE_COLUMN_SETS) {
    const result = await run(columns);
    if (result.error?.code !== MISSING_COLUMN) return result;
  }
  return run(COLUMNS);
}
const POST_COLUMNS = `id, kind, body, image_path, image_width, image_height, image_palette, images, quote_post_id, quote_demo_post_id, created_at, author:profiles!inner(${COLUMNS})`;

/** Posts with the milestone they celebrate; a database without that column reads without it. */
async function withMilestone<R extends { error: { code: string } | null }>(run: (columns: string) => PromiseLike<R>): Promise<R> {
  const result = await run(`${POST_COLUMNS}, milestone`);
  return result.error?.code === MISSING_COLUMN ? run(POST_COLUMNS) : result;
}

/** Lets demo-only setups (no Supabase keys yet) keep working. */
export const configured = () => Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);

export async function fetchAccount(handle: string): Promise<ArtistProfile | null> {
  if (!configured()) return null;
  const { data, error } = await withProfileColumns((columns) =>
    createSupabasePublic().from("profiles").select(columns).eq("handle", handle).maybeSingle<AccountRow>(),
  );
  if (error) throw new Error(`Couldn't load @${handle}: ${error.message}`);
  return data ? toArtistProfile(data) : null;
}

export async function fetchAccounts(handles: string[]): Promise<ArtistProfile[]> {
  if (!configured() || handles.length === 0) return [];
  const { data, error } = await withProfileColumns((columns) =>
    createSupabasePublic().from("profiles").select(columns).in("handle", handles).returns<AccountRow[]>(),
  );
  if (error || !data) throw new Error(`Couldn't load profiles: ${error?.message}`);
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
  const { data, error } = await withMilestone((columns) =>
    createSupabasePublic()
      .from("posts")
      .select(columns)
      .eq("author.handle", handle)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PostRow[]>(),
  );
  if (error) throw new Error(`Couldn't load @${handle}'s posts: ${error.message}`);
  return data.map(toPost);
}

/** Newest posts from every real account, with their authors (for the home feed). */
export async function fetchRecentPosts(limit = 60): Promise<{ posts: Post[]; authors: ArtistProfile[] }> {
  if (!configured()) return { posts: [], authors: [] };
  const { data, error } = await withMilestone((columns) =>
    createSupabasePublic()
      .from("posts")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<PostRow[]>(),
  );
  if (error) throw new Error(`Couldn't load the feed: ${error.message}`);
  const authors = new Map(data.map((row) => [row.author.handle, toArtistProfile(row.author)]));
  return { posts: data.map(toPost), authors: [...authors.values()] };
}

/** Specific posts by id (reposts pin them), whoever wrote them. */
export async function fetchPostsByIds(ids: string[]): Promise<{ posts: Post[]; authors: ArtistProfile[] }> {
  if (!configured() || ids.length === 0) return { posts: [], authors: [] };
  const { data, error } = await withMilestone((columns) =>
    createSupabasePublic()
      .from("posts")
      .select(columns)
      .in("id", ids)
      .returns<PostRow[]>(),
  );
  if (error) throw new Error(`Couldn't load reposted posts: ${error.message}`);
  const authors = new Map(data.map((row) => [row.author.handle, toArtistProfile(row.author)]));
  return { posts: data.map(toPost), authors: [...authors.values()] };
}

function toPost(row: PostRow): Post {
  const alt = `Artwork shared by @${row.author.handle}`;
  const images =
    row.images?.length
      ? row.images
      : row.image_path && row.image_width && row.image_height
        ? [{ path: row.image_path, width: row.image_width, height: row.image_height, palette: row.image_palette }]
        : [];
  return {
    id: row.id,
    authorHandle: row.author.handle,
    kind: row.kind,
    body: row.body,
    media: images.map((image) => toImageAsset(image, alt)),
    quotePostId: row.quote_post_id ?? row.quote_demo_post_id ?? undefined,
    ...(row.milestone?.kind === "artist_pass" &&
      row.milestone.since && {
        milestone: { kind: "artist_pass", since: row.milestone.since, number: row.milestone.number, invitedBy: row.milestone.invitedBy },
      }),
    createdAt: row.created_at,
    likes: 0,
    // Real counts come from `hydratePosts` (queries.ts).
    comments: 0,
  };
}

export function toPostAuthor(row: AccountRow): PostAuthor {
  const { handle, displayName, avatar, plan } = toArtistProfile(row);
  return { handle, displayName, avatar, plan };
}

export function toArtistProfile(row: AccountRow): ArtistProfile {
  const art = defaultArt(row.handle, row.display_name);
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    headline: row.headline ?? "",
    ...(row.pronouns && { pronouns: row.pronouns }),
    ...(row.location && { location: row.location }),
    bio: row.bio,
    joinedAt: row.created_at.slice(0, 10),
    // Flow+ is still `pro` in the app's types (see docs/roadmap.md).
    plan: row.plan === "flow_plus" ? "pro" : "free",
    avatar: row.avatar ? toImageAsset(row.avatar, row.display_name) : art.avatar,
    banner: row.banner ? toImageAsset(row.banner, "") : art.banner,
    stats: { followers: 0, following: 0, artworks: 0 },
    commissions: { status: "closed", slotsTotal: 0, slotsTaken: 0, startingPriceUsd: 0, turnaround: "", types: [] },
    gallery: { total: 0, preview: [] },
    links: (Array.isArray(row.links) ? row.links : []).flatMap((link) => {
      const url = typeof link?.url === "string" ? normalizeUrl(link.url) : null;
      return url ? [toSocialLink(url, link.label)] : [];
    }),
    draws: cleanDraws(row.draws ?? []),
    ...(row.artist_since !== undefined && {
      artist: row.artist_since ? { since: row.artist_since, ...(row.inviter && { invitedBy: row.inviter.handle }) } : null,
    }),
    appearance: { accent: art.accent, bannerFocusY: 50 },
    ...(row.customization !== undefined && { customization: readCustomization(row.customization) }),
    ...(row.about !== undefined && { about: readBoard(row.about) }),
  };
}
