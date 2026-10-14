import "server-only";
import { cache } from "react";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { configured } from "@/lib/profile/accounts";
import { defaultArt } from "@/lib/profile/default-art";
import { getProfile } from "@/lib/profile/queries";
import type { HeldCode, Progress, ViewerPass } from "./codes";
import { getViewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabasePublic, createSupabaseServer } from "@/lib/supabase/server";

/*
 * The signed-in viewer's artist access and the artist codes they hold. Per
 * request and uncached: access changes the moment a code is used, and codes
 * are private (row level security: you only see the invites you hold).
 */

export type ViewerAccess = { id: string; handle: string; artist: { since: string; invitedBy?: string; verifiedAt?: string } | null };

/** Who's signed in and whether they can sell. Reads cookies: call it inside <Suspense>. */
export const getViewerAccess = cache(async (): Promise<ViewerAccess | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  if (!configured()) return { ...viewer, artist: null };
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("*, inviter:invited_by(handle)")
    .eq("id", viewer.id)
    .maybeSingle<{ artist_since: string | null; verified_at?: string | null; inviter: { handle: string } | null }>();
  const since = data?.artist_since;
  return {
    ...viewer,
    artist: since
      ? { since, ...(data?.inviter && { invitedBy: data.inviter.handle }), ...(data?.verified_at && { verifiedAt: data.verified_at }) }
      : null,
  };
});

type CodeRow = {
  code: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed: { handle: string; display_name: string; avatar: StoredImage | null } | null;
};

/** The artist codes the viewer holds, oldest first, with who used each. */
export async function getViewerCodes(): Promise<HeldCode[]> {
  const viewer = await getViewer();
  if (!viewer || !configured()) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("invites")
    .select("code, created_at, redeemed_at, redeemed:profiles!invites_redeemed_by_fkey(handle, display_name, avatar)")
    .eq("inviter_id", viewer.id)
    .order("created_at")
    .order("code")
    .returns<CodeRow[]>();
  if (error) {
    console.error(`Couldn't load artist codes: ${error.message}`);
    return [];
  }
  return data.map((row) => ({
    code: row.code,
    grantedAt: row.created_at,
    usedAt: row.redeemed_at,
    usedBy: row.redeemed
      ? {
          handle: row.redeemed.handle,
          displayName: row.redeemed.display_name,
          avatar: row.redeemed.avatar
            ? toImageAsset(row.redeemed.avatar, row.redeemed.display_name)
            : defaultArt(row.redeemed.handle, row.redeemed.display_name).avatar,
        }
      : null,
  }));
}

/**
 * For the header: how many codes the viewer can still give, and how many
 * arrived since they last saw them (the gift modal shows those, once).
 * Null when there's nothing to say, or on a database without codes yet.
 */
export async function getViewerCodeNews(): Promise<{ toGive: number; fresh: number; reason: "grant" | "weekly" | "verified"; invitedBy?: string } | null> {
  const viewer = await getViewer();
  if (!viewer || !configured()) return null;
  const supabase = await createSupabaseServer();
  const [me, held] = await Promise.all([
    supabase
      .from("profiles")
      .select("codes_seen_at, inviter:invited_by(handle)")
      .eq("id", viewer.id)
      .maybeSingle<{ codes_seen_at: string | null; inviter: { handle: string } | null }>(),
    supabase
      .from("invites")
      .select("created_at, redeemed_at, note")
      .eq("inviter_id", viewer.id)
      .returns<{ created_at: string; redeemed_at: string | null; note: string | null }[]>(),
  ]);
  if (me.error || held.error || !held.data?.length) return null;
  const seen = me.data?.codes_seen_at ? Date.parse(me.data.codes_seen_at) : -Infinity;
  const toGive = held.data.filter((c) => !c.redeemed_at).length;
  const news = held.data.filter((c) => !c.redeemed_at && Date.parse(c.created_at) > seen);
  // Why they came, so the gift can say so: Flow+'s weekly code, or the prize for getting verified.
  const all = (prefix: string) => news.length > 0 && news.every((c) => c.note?.startsWith(prefix));
  const reason = all("weekly") ? "weekly" : all("verified") ? "verified" : "grant";
  return { toGive, fresh: news.length, reason, ...(me.data?.inviter && { invitedBy: me.data.inviter.handle }) };
}

/**
 * The viewer's Artist Pass, if they're an artist: their picture and name, their
 * number (artists in the order they got in), since when, whose code, and the
 * id of the post that shared it (null: not shared yet).
 */
export async function getViewerPass(): Promise<ViewerPass | null> {
  const access = await getViewerAccess();
  if (!access?.artist) return null;
  const supabase = createSupabasePublic();
  const [profile, earlier, shared] = await Promise.all([
    getProfile(access.handle),
    supabase.from("profiles").select("id", { count: "exact", head: true }).lte("artist_since", access.artist.since),
    supabase.from("posts").select("id").eq("author_id", access.id).not("milestone", "is", null).limit(1),
  ]);
  if (!profile) return null;
  return {
    handle: access.handle,
    name: profile.displayName,
    avatar: profile.avatar,
    number: earlier.count ?? undefined,
    since: access.artist.since,
    ...(access.artist.invitedBy && { invitedBy: access.artist.invitedBy }),
    ...(access.artist.verifiedAt && { verifiedAt: access.artist.verifiedAt }),
    shared: shared.data?.[0]?.id ?? null,
  };
}

/** The viewer's way to verification: followers and paid sales (totals only, read with the secret key). */
export async function getViewerProgress(): Promise<Progress | null> {
  const access = await getViewerAccess();
  if (!access?.artist || !configured()) return null;
  const { data, error } = await createSupabaseAdmin().rpc("artist_progress", { uid: access.id }).maybeSingle<{ followers: number; sales_usd: number | string }>();
  if (error || !data) return null;
  return { followers: Number(data.followers) || 0, salesUsd: Number(data.sales_usd) || 0 };
}
