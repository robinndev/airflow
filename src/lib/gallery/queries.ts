import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/profile/mock-db";
import { adoptablesTag, artworksTag, galleryTag, getAdoptables, getArtworks, postsTag } from "@/lib/profile/queries";
import { assembleGallery, postPieces } from "./assemble";
import { demoCharacters, demoCollections, demoPieces } from "./demo";
import { fetchGalleryByHandle } from "./server";
import type { Character, Collection, Gallery } from "./types";

/*
 * Cached gallery reads. Demo artists come from mock-db + demo.ts (plus their
 * posts' pictures), real accounts from Supabase (where a trigger hangs every
 * post's pictures). The gallery's Server Actions invalidate
 * `galleryTag(handle)`; posts and adoption listings bring their own tags.
 */

export { galleryTag };

export async function getGallery(handle: string): Promise<Gallery> {
  "use cache";
  cacheLife("hours");
  // Posts hang their pictures here, so a new or deleted post refreshes it too.
  cacheTag(galleryTag(handle), artworksTag(handle), adoptablesTag(handle), postsTag(handle));

  const adoptables = await getAdoptables(handle);
  if (db.profiles.some((p) => p.handle === handle)) {
    const pieces = [...(await getArtworks(handle)), ...demoPieces.filter((p) => p.ownerHandle === handle)];
    return assembleGallery({
      pieces: [...pieces, ...postPieces(db.posts, handle, pieces)],
      characters: demoCharacters.filter((c) => c.ownerHandle === handle),
      collections: demoCollections.filter((c) => c.ownerHandle === handle),
      adoptables,
    });
  }
  return assembleGallery({ ...(await fetchGalleryByHandle(handle)), adoptables });
}

export async function getCharacter(handle: string, slug: string): Promise<Character | null> {
  return (await getGallery(handle)).characters.find((c) => c.slug === slug) ?? null;
}

export async function getCollection(handle: string, slug: string): Promise<Collection | null> {
  return (await getGallery(handle)).collections.find((c) => c.slug === slug) ?? null;
}
