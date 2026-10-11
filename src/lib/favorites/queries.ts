import { cache } from "react";
import { getExploreData, type ArtistRef } from "@/lib/explore";
import { moodsOf, type MoodSlug } from "@/lib/palette";
import { configured, fetchPostsByIds } from "@/lib/profile/accounts";
import { isDemoPostId, isRealPostId } from "@/lib/profile/conversation";
import { db } from "@/lib/profile/mock-db";
import type {
  ArtistProfile,
  CommissionService,
  CommissionStatus,
  ImageAsset,
  Post,
  PostAuthor,
} from "@/lib/profile/types";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DEMO_ID, favoriteKey, isFavoriteKind, type FavoriteKey, type FavoriteKind } from "./keys";

/*
 * A viewer's moodboard: their `favorites` rows, resolved into what the
 * /favorites page shows. Favorites are private, so these reads use the
 * viewer's session (row level security) and aren't cached. Saved things that
 * are gone (a deleted post) simply drop off the board.
 */

type Saved = {
  key: FavoriteKey;
  id: string;
  savedAt: string;
  title: string;
  /** Colors of the art, for the swatch card and the color filter. */
  palette: string[];
  moods: MoodSlug[];
  href: string;
};

export type FavoriteArt = Saved & {
  kind: "art";
  image: ImageAsset;
  artist: ArtistRef;
  adopt?: { priceUsd?: number; status: "available" | "reserved" | "adopted" };
  /** Lowest price while the artist takes commissions. */
  commissionFromUsd?: number;
};

export type FavoritePost = Saved & {
  kind: "post";
  post: Post;
  author: PostAuthor;
  /** What to show: the post's own images, or the original it reposts. */
  media: ImageAsset[];
};

export type FavoriteService = Saved & {
  kind: "service";
  service: CommissionService;
  artist: ArtistRef;
  status: CommissionStatus;
  slotsLeft: number;
  slotsTotal: number;
};

export type FavoriteItem = FavoriteArt | FavoritePost | FavoriteService;

type FavoriteRow = { kind: string; post_id: string | null; demo_id: string | null; created_at: string };
export type FavoriteRef = { kind: FavoriteKind; id: string; savedAt: string };

/** The viewer's favorites, newest first. A database without the table yet reads as an empty board. */
export async function fetchFavoriteRefs(userId: string): Promise<FavoriteRef[]> {
  if (!configured()) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("favorites")
    .select("kind, post_id, demo_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<FavoriteRow[]>();
  if (error) {
    console.error(`Couldn't load favorites: ${error.message}`);
    return [];
  }
  return data.flatMap((row) => {
    const id = row.post_id ?? row.demo_id;
    return isFavoriteKind(row.kind) && id ? [{ kind: row.kind, id, savedAt: row.created_at }] : [];
  });
}

/** Can this be saved? Demo things must exist; real posts are checked by the caller. */
export async function isSavable(kind: FavoriteKind, id: string): Promise<boolean> {
  if (kind === "post") return isRealPostId(id) || isDemoPostId(id);
  if (!DEMO_ID.test(id)) return false;
  if (kind === "service") return db.services.some((s) => s.id === id);
  return (await getExploreData()).wall.some((piece) => piece.id === id);
}

const artistOf = (p: Pick<ArtistProfile, "handle" | "displayName" | "avatar" | "plan">): ArtistRef => ({
  handle: p.handle,
  name: p.displayName,
  avatar: p.avatar,
  href: `/${p.handle}`,
  isPro: p.plan === "pro",
});

/** A post's title, as written on a print: the first clause of its caption. */
export function captionOf(body: string) {
  return body.split(/[\n,.!?—]/)[0].replace(/\p{Extended_Pictographic}/gu, "").trim();
}

async function resolve(refs: FavoriteRef[]): Promise<FavoriteItem[]> {
  const ids = (kind: FavoriteKind) => refs.filter((r) => r.kind === kind).map((r) => r.id);

  // Art: everything on Explore's wall (the demo artists' galleries are on it too).
  const wall = ids("art").length ? (await getExploreData()).wall : [];
  const pieces = new Map(wall.map((piece) => [piece.id, piece]));

  // Posts: demo ones from mock-db, real ones (and the originals they repost) from Supabase.
  const posts = new Map<string, Post>(db.posts.map((p) => [p.id, p]));
  const authors = new Map<string, PostAuthor>(
    db.profiles.map((p) => [p.handle, { handle: p.handle, displayName: p.displayName, avatar: p.avatar, plan: p.plan }]),
  );
  const load = async (wanted: string[]) => {
    const missing = wanted.filter((id) => isRealPostId(id) && !posts.has(id));
    if (missing.length === 0) return;
    try {
      const found = await fetchPostsByIds(missing);
      for (const p of found.posts) posts.set(p.id, p);
      for (const a of found.authors) authors.set(a.handle, { handle: a.handle, displayName: a.displayName, avatar: a.avatar, plan: a.plan });
    } catch (error) {
      console.error(error);
    }
  };
  await load(ids("post"));
  await load(ids("post").flatMap((id) => posts.get(id)?.quotePostId ?? []));

  return refs.flatMap((ref): FavoriteItem[] => {
    const base = { key: favoriteKey(ref.kind, ref.id), id: ref.id, savedAt: ref.savedAt };

    if (ref.kind === "art") {
      const piece = pieces.get(ref.id);
      if (!piece) return [];
      const palette = piece.image.palette ?? [];
      return [
        {
          ...base,
          kind: "art",
          title: piece.title,
          palette,
          moods: piece.moods,
          href: piece.href,
          image: piece.image,
          artist: piece.artist,
          adopt: piece.adopt,
          commissionFromUsd: piece.commissionFromUsd,
        },
      ];
    }

    if (ref.kind === "post") {
      const post = posts.get(ref.id);
      const author = post && authors.get(post.authorHandle);
      if (!post || !author) return [];
      const original = post.quotePostId ? posts.get(post.quotePostId) : undefined;
      const media = post.media.length ? post.media : (original?.media ?? []);
      const palette = media[0]?.palette ?? [];
      return [
        {
          ...base,
          kind: "post",
          title: captionOf(post.body) || captionOf(original?.body ?? "") || `${author.displayName}'s post`,
          palette,
          moods: moodsOf(palette),
          href: `/${author.handle}#${post.id}`,
          post,
          author,
          media,
        },
      ];
    }

    const service = db.services.find((s) => s.id === ref.id);
    const owner = service && db.profiles.find((p) => p.handle === service.ownerHandle);
    if (!service || !owner) return [];
    const { status, slotsTotal, slotsTaken } = owner.commissions;
    const palette = service.examples[0]?.palette ?? [];
    return [
      {
        ...base,
        kind: "service",
        title: service.title,
        palette,
        moods: moodsOf(palette),
        href: `/${owner.handle}/commissions#${service.id}`,
        service,
        artist: artistOf(owner),
        status,
        slotsTotal,
        slotsLeft: Math.max(0, slotsTotal - slotsTaken),
      },
    ];
  });
}

/**
 * The signed-in viewer's moodboard, or null for visitors. Deduped per request,
 * so the swatch card and the board share one read. Reads cookies: call it
 * inside <Suspense>.
 */
export const getViewerFavorites = cache(async (): Promise<FavoriteItem[] | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  return resolve(await fetchFavoriteRefs(viewer.id));
});
