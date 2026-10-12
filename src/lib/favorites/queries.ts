import { cache } from "react";
import { getExploreData, type ArtistRef, type WallPiece } from "@/lib/explore";
import { moodsOf, type MoodSlug } from "@/lib/palette";
import { toImageAsset } from "@/lib/art-storage";
import { demoCharacters, demoPieces } from "@/lib/gallery/demo";
import { getGallery } from "@/lib/gallery/queries";
import { fetchArtworksByIds, fetchCharactersByIds, toPiece } from "@/lib/gallery/server";
import { characterHref, characterPalette, type Piece } from "@/lib/gallery/types";
import { configured, fetchPostsByIds, toArtistProfile } from "@/lib/profile/accounts";
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

/** A character saved on their own: their cover, name and colors. */
export type FavoriteCharacter = Saved & {
  kind: "character";
  name: string;
  species: string;
  image?: ImageAsset;
  artist: ArtistRef;
};

export type FavoriteItem = FavoriteArt | FavoritePost | FavoriteService | FavoriteCharacter;

type FavoriteRow = {
  kind: string;
  post_id: string | null;
  artwork_id?: string | null;
  character_id?: string | null;
  demo_id: string | null;
  created_at: string;
};
export type FavoriteRef = { kind: FavoriteKind; id: string; savedAt: string };

/** The viewer's favorites, newest first. A database without the table yet reads as an empty board. */
export async function fetchFavoriteRefs(userId: string): Promise<FavoriteRef[]> {
  if (!configured()) return [];
  const supabase = await createSupabaseServer();
  const read = (columns: string) =>
    supabase
      .from("favorites")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5000)
      .returns<FavoriteRow[]>();
  let { data, error } = await read("kind, post_id, artwork_id, character_id, demo_id, created_at");
  // A database without the gallery migration yet (no artwork_id / character_id).
  if (error?.code === "42703") ({ data, error } = await read("kind, post_id, demo_id, created_at"));
  if (error || !data) {
    console.error(`Couldn't load favorites: ${error?.message}`);
    return [];
  }
  return data.flatMap((row) => {
    const id = row.post_id ?? row.artwork_id ?? row.character_id ?? row.demo_id;
    return isFavoriteKind(row.kind) && id ? [{ kind: row.kind, id, savedAt: row.created_at }] : [];
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Real (uuid) gallery pieces and characters are rows; everything else saved is still demo data. */
export const isRealGalleryId = (kind: FavoriteKind, id: string) => (kind === "art" || kind === "character") && UUID.test(id);

/** Can this be saved? It must exist; real posts are checked by the caller. */
export async function isSavable(kind: FavoriteKind, id: string): Promise<boolean> {
  if (kind === "post") return isRealPostId(id) || isDemoPostId(id);
  if (kind === "art" && UUID.test(id)) return (await fetchArtworksByIds([id])).length > 0;
  if (kind === "character" && UUID.test(id)) return (await fetchCharactersByIds([id])).length > 0;
  if (!DEMO_ID.test(id)) return false;
  if (kind === "service") return db.services.some((s) => s.id === id);
  if (kind === "character") return demoCharacters.some((c) => c.id === id);
  return demoPieces.some((p) => p.id === id) || (await getExploreData()).wall.some((piece) => piece.id === id);
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

/** A gallery piece as the moodboard hangs it (the same shape as Explore's wall). */
const galleryPiece = (piece: Piece, artist: ArtistRef): WallPiece => ({
  id: piece.id,
  title: piece.title,
  image: piece.image,
  artist,
  href: `/${artist.handle}/gallery#pieces`,
  moods: moodsOf(piece.image.palette ?? []),
  likes: piece.likes,
  postedAt: piece.createdAt,
});

async function resolve(refs: FavoriteRef[]): Promise<FavoriteItem[]> {
  const ids = (kind: FavoriteKind) => refs.filter((r) => r.kind === kind).map((r) => r.id);

  // Art: everything on Explore's wall (the demo artists' galleries are on it too),
  // the gallery's demo pieces, and real gallery pieces.
  const wall = ids("art").length ? (await getExploreData()).wall : [];
  const pieces = new Map(wall.map((piece) => [piece.id, piece]));
  const profiles = new Map(db.profiles.map((p) => [p.handle, p]));
  for (const piece of demoPieces) {
    const owner = profiles.get(piece.ownerHandle);
    if (owner && !pieces.has(piece.id)) {
      pieces.set(piece.id, galleryPiece(piece, artistOf(owner)));
    }
  }
  const realArt = await fetchArtworksByIds(ids("art").filter((id) => UUID.test(id))).catch((error) => (console.error(error), []));
  for (const row of realArt) {
    const owner = toArtistProfile(row.owner);
    const piece = toPiece(row, owner.handle);
    pieces.set(piece.id, galleryPiece(piece, artistOf(owner)));
  }

  // Characters: the demo artists' and real ones, with their cover and colors.
  const characters = new Map<string, Omit<FavoriteCharacter, keyof Saved | "kind"> & Pick<Saved, "title" | "palette" | "href">>();
  const demoOwners = [...new Set(demoCharacters.filter((c) => ids("character").includes(c.id)).map((c) => c.ownerHandle))];
  for (const handle of demoOwners) {
    const owner = profiles.get(handle);
    if (!owner) continue;
    for (const c of (await getGallery(handle)).characters) {
      characters.set(c.id, { title: c.name, name: c.name, species: c.species, palette: c.palette, href: c.href, image: c.cover, artist: artistOf(owner) });
    }
  }
  const realCharacters = await fetchCharactersByIds(ids("character").filter((id) => UUID.test(id))).catch((error) => (console.error(error), []));
  for (const row of realCharacters) {
    const owner = toArtistProfile(row.owner);
    const image = row.cover ? toImageAsset(row.cover.image, row.cover.title) : undefined;
    characters.set(row.id, {
      title: row.name,
      name: row.name,
      species: row.species,
      palette: characterPalette(row.palette, image),
      href: characterHref(owner.handle, row.slug),
      image,
      artist: artistOf(owner),
    });
  }

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

    if (ref.kind === "character") {
      const character = characters.get(ref.id);
      if (!character) return [];
      return [{ ...base, kind: "character", ...character, moods: moodsOf(character.palette) }];
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
