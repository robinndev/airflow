import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/profile/mock-db";
import { adoptablesTag, artworksTag, getAdoptables, getArtworks } from "@/lib/profile/queries";
import { assembleGallery } from "./assemble";
import { demoCharacters, demoCollections, demoPieces } from "./demo";
import { fetchGalleryByHandle } from "./server";
import type { Character, Collection, Gallery } from "./types";

/*
 * Cached gallery reads. Demo artists come from mock-db + demo.ts, real
 * accounts from Supabase. The gallery's Server Actions invalidate
 * `galleryTag(handle)`; adoption listings bring their own tag.
 */

export const galleryTag = (handle: string) => `gallery:${handle}`;

export async function getGallery(handle: string): Promise<Gallery> {
  "use cache";
  cacheLife("hours");
  cacheTag(galleryTag(handle), artworksTag(handle), adoptablesTag(handle));

  const adoptables = await getAdoptables(handle);
  if (db.profiles.some((p) => p.handle === handle)) {
    return assembleGallery({
      pieces: [...(await getArtworks(handle)), ...demoPieces.filter((p) => p.ownerHandle === handle)],
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
