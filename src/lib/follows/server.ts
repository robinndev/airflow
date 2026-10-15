import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { configured } from "@/lib/profile/accounts";
import { defaultArt } from "@/lib/profile/default-art";
import { cleanDraws } from "@/lib/profile/draws";
import { db } from "@/lib/profile/mock-db";
import { createSupabasePublic } from "@/lib/supabase/server";
import { FOLLOW_PAGE, type FollowList, type FollowPage, type FollowPerson } from "./list";

/*
 * Follower and following lists from `follow_list()` (*_follow_lists.sql).
 * Follows are public, so these read with the cookie-less client and work
 * inside `"use cache"`. A database without the function reads as an empty
 * list (and says so in the log), like the rest of the social reads.
 */

type ListRow = {
  id: string | null;
  handle: string;
  display_name: string | null;
  avatar: StoredImage | null;
  banner: StoredImage | null;
  plan: string | null;
  draws: string[] | null;
  artist_since: string | null;
  verified_at: string | null;
  followed_at: string;
  total: number;
};

export type ListOptions = {
  offset?: number;
  /** Words that find someone by handle or name. */
  query?: string;
  /** Only the people who also follow this account (the viewer). */
  follows?: string;
};

/** One page of someone's followers or following, newest follow first. */
export async function fetchFollowList(handle: string, list: FollowList, options: ListOptions = {}): Promise<FollowPage> {
  if (!configured()) return { people: [], total: 0 };
  const { data, error } = await createSupabasePublic().rpc("follow_list", {
    p_handle: handle,
    p_list: list,
    p_query: options.query || null,
    p_follows: options.follows ?? null,
    p_limit: FOLLOW_PAGE,
    p_offset: options.offset ?? 0,
  });
  if (error) {
    console.error(`Couldn't load @${handle}'s ${list}: ${error.message}`);
    return { people: [], total: 0 };
  }
  const rows = (data ?? []) as ListRow[];
  return { people: rows.flatMap(toPerson), total: rows[0]?.total ?? 0 };
}

function toPerson(row: ListRow): FollowPerson[] {
  // A demo artist: no account, so the card comes from the demo data.
  if (!row.id) {
    const demo = db.profiles.find((p) => p.handle === row.handle);
    if (!demo) return [];
    return [
      {
        id: demo.id,
        handle: demo.handle,
        displayName: demo.displayName,
        avatar: demo.avatar,
        banner: demo.banner,
        plan: demo.plan,
        artist: { verified: Boolean(demo.artist?.verifiedAt) },
        draws: demo.draws,
        followedAt: row.followed_at,
      },
    ];
  }
  const name = row.display_name ?? row.handle;
  const art = defaultArt(row.handle, name);
  return [
    {
      id: row.id,
      handle: row.handle,
      displayName: name,
      avatar: row.avatar ? toImageAsset(row.avatar, name) : art.avatar,
      banner: row.banner ? toImageAsset(row.banner, "") : art.banner,
      // Flow+ is still `pro` in the app's types.
      plan: row.plan === "flow_plus" ? "pro" : "free",
      artist: row.artist_since ? { verified: Boolean(row.verified_at) } : null,
      draws: cleanDraws(row.draws ?? []),
      followedAt: row.followed_at,
    },
  ];
}

type FollowerRow = { follower: { handle: string } | null };

/** Which of these handles follow an account (the "Follows you" on each card). */
export async function fetchFollowersAmong(userId: string, handles: string[]): Promise<string[]> {
  // Demo artists have no account, so they never follow anyone.
  const real = handles.filter((h) => !db.profiles.some((p) => p.handle === h));
  if (!configured() || real.length === 0) return [];
  const { data, error } = await createSupabasePublic()
    .from("follows")
    .select("follower:profiles!follows_follower_id_fkey!inner(handle)")
    .eq("followee_id", userId)
    .in("follower.handle", real)
    .returns<FollowerRow[]>();
  if (error) {
    console.error(`Couldn't check who follows back: ${error.message}`);
    return [];
  }
  return data.flatMap((row) => (row.follower ? [row.follower.handle] : []));
}
