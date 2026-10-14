import { Caveat } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FolderPlus, ImagePlus, Layers } from "lucide-react";
import { HandNote } from "@/components/explore/doodles";
import { CharacterFolder } from "@/components/gallery/character-folder";
import { CollectionStack } from "@/components/gallery/collection-stack";
import { GalleryDialogs, GalleryWall, NewCharacterSlot, NewCollectionSlot, OwnerButton, ShowFor } from "@/components/gallery/owner/gallery-owner";
import { SectionLabel } from "@/components/gallery/paper";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { galleryIndex } from "@/lib/gallery/assemble";
import { getGallery } from "@/lib/gallery/queries";
import { getAdoptables, getProfile, normalizeHandle } from "@/lib/profile/queries";

/*
 * The gallery: the artist's creative center. Three shelves, top to bottom:
 * their characters (each a file with its own page), their collections
 * (stacks of prints) and every piece on the wall. Static for everyone; the
 * artist's own buttons and dialogs switch on in the browser.
 */

export const metadata = { title: "Gallery" };

// The artist's handwriting, for the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export default function GalleryPage({ params }: PageProps<"/[handle]/gallery">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Gallery params={params} />
    </Suspense>
  );
}

async function Gallery({ params }: Pick<PageProps<"/[handle]/gallery">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const [profile, gallery, adoptables] = await Promise.all([getProfile(handle), getGallery(handle), getAdoptables(handle)]);
  if (!profile) notFound();

  const index = galleryIndex(gallery, { handle, ownerId: profile.id, adoptables });
  const labels = Object.fromEntries(
    gallery.pieces.map((p) => [
      p.id,
      gallery.characters.filter((c) => c.art.some((a) => a.piece.id === p.id)).map((c) => ({ name: c.name, href: c.href })),
    ]),
  );
  const { characters, collections, pieces } = gallery;
  const ownerId = profile.id;
  const first = profile.displayName.split(" ")[0];

  return (
    <section className={hand.variable}>
      <div className="flex flex-wrap items-end justify-between gap-x-4">
        <SectionHeader handle={handle} title="Gallery" description="Characters, collections and every piece, the pictures from posts included." />
        <div className="mb-5 flex flex-wrap gap-2">
          <OwnerButton ownerId={ownerId} dialog={{ type: "add-art" }} className={buttonClasses({ size: "sm" })}>
            <ImagePlus aria-hidden />
            Add art
          </OwnerButton>
          <OwnerButton ownerId={ownerId} dialog={{ type: "character", characterId: null }} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <FolderPlus aria-hidden />
            New character
          </OwnerButton>
          <OwnerButton ownerId={ownerId} dialog={{ type: "collection", collectionId: null }} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Layers aria-hidden />
            New collection
          </OwnerButton>
        </div>
      </div>

      <ShowFor ownerId={ownerId} always={characters.length > 0}>
        <section aria-labelledby="gallery-characters" id="characters" className="mb-12 scroll-mt-24">
          <SectionLabel
            id="gallery-characters"
            title="Characters"
            count={characters.length}
            hint={characters.length ? `Open a file to meet them: design, outfits, story.` : "Your OCs, each with a page of their own."}
            action={
              characters.length > 0 && (
                <HandNote tone="lilac" className="hidden -rotate-2 text-xl sm:inline-block">
                  {characters.length === 1 ? `${first}'s OC` : `${first}'s cast`}
                </HandNote>
              )
            }
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5">
            {characters.map((character, i) => (
              <CharacterFolder key={character.id} character={character} priority={i < 3} />
            ))}
            <NewCharacterSlot ownerId={ownerId} />
          </ul>
        </section>
      </ShowFor>

      <ShowFor ownerId={ownerId} always={collections.length > 0}>
        <section aria-labelledby="gallery-collections" id="collections" className="mb-12 scroll-mt-24">
          <SectionLabel
            id="gallery-collections"
            title="Collections"
            count={collections.length}
            hint={collections.length ? "Series, studies and projects." : "Group pieces: a series, studies, a project."}
          />
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
            {collections.map((collection) => (
              <CollectionStack key={collection.id} collection={collection} />
            ))}
            <NewCollectionSlot ownerId={ownerId} />
          </ul>
        </section>
      </ShowFor>

      <section aria-labelledby="gallery-pieces" id="pieces" className="scroll-mt-24">
        <SectionLabel id="gallery-pieces" title="Every piece" count={pieces.length} hint="Newest first, pictures from posts included. Click one to see it whole." />
        <GalleryWall
          pieces={pieces}
          labels={labels}
          filters
          index={index}
          empty={
            <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
              <p className="font-display text-lg font-bold text-ink">No artworks yet</p>
              <p className="mt-1 text-sm text-muted">Pictures from posts and pieces added here will show up here.</p>
              <OwnerButton ownerId={ownerId} dialog={{ type: "add-art" }} className={buttonClasses({ className: "mt-5" })}>
                <ImagePlus aria-hidden />
                Add your first piece
              </OwnerButton>
            </div>
          }
        />
      </section>

      <GalleryDialogs index={index} />
    </section>
  );
}
