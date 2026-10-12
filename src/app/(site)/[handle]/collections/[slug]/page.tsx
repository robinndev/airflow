import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ImagePlus, Pencil } from "lucide-react";
import { CopyLinkButton } from "@/components/gallery/character-actions";
import { GalleryDialogs, GalleryWall, OwnerButton } from "@/components/gallery/owner/gallery-owner";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { galleryIndex } from "@/lib/gallery/assemble";
import { getCollection, getGallery } from "@/lib/gallery/queries";
import { getAdoptables, getProfile, normalizeHandle } from "@/lib/profile/queries";

/* A collection's page: its title and note, then its pieces on the wall. */

const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export async function generateMetadata({ params }: PageProps<"/[handle]/collections/[slug]">): Promise<Metadata> {
  const { handle: raw, slug } = await params;
  const handle = normalizeHandle(raw);
  const collection = await getCollection(handle, slug);
  if (!collection) return { title: "Collection not found" };
  const title = `${collection.title}, by @${handle}`;
  return {
    title,
    description: collection.description || `${collection.pieces.length} pieces by @${handle}.`,
    openGraph: {
      title,
      images: collection.cover ? [{ url: collection.cover.src, width: collection.cover.width, height: collection.cover.height }] : undefined,
    },
  };
}

export default function CollectionPage({ params }: PageProps<"/[handle]/collections/[slug]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CollectionView params={params} />
    </Suspense>
  );
}

async function CollectionView({ params }: Pick<PageProps<"/[handle]/collections/[slug]">, "params">) {
  const { handle: raw, slug } = await params;
  const handle = normalizeHandle(raw);
  const [profile, gallery, adoptables] = await Promise.all([getProfile(handle), getGallery(handle), getAdoptables(handle)]);
  const collection = gallery.collections.find((c) => c.slug === slug);
  if (!profile || !collection) notFound();

  const index = galleryIndex(gallery, { handle, ownerId: profile.id, adoptables });
  const labels = Object.fromEntries(
    collection.pieces.map((p) => [
      p.id,
      gallery.characters.filter((c) => c.art.some((a) => a.piece.id === p.id)).map((c) => ({ name: c.name, href: c.href })),
    ]),
  );
  const ownerId = profile.id;

  return (
    <article className={`${hand.variable}`} data-part="collection-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${handle}/gallery#collections`}
          className="inline-flex items-center gap-1.5 rounded-input text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Gallery
        </Link>
        <div className="flex flex-wrap gap-2">
          <OwnerButton
            ownerId={ownerId}
            dialog={{ type: "add-art", placement: { characters: [], collections: [collection.id] } }}
            className={buttonClasses({ size: "sm" })}
          >
            <ImagePlus aria-hidden />
            Add art
          </OwnerButton>
          <OwnerButton
            ownerId={ownerId}
            dialog={{ type: "collection", collectionId: collection.id }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Pencil aria-hidden />
            Edit
          </OwnerButton>
        </div>
      </div>

      <header className="mt-5 mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold tracking-[0.18em] text-muted uppercase">
            Collection · {collection.pieces.length} {collection.pieces.length === 1 ? "piece" : "pieces"}
          </p>
          <h1 className="mt-1 font-display text-4xl leading-tight font-extrabold tracking-[-0.03em] text-balance text-ink">{collection.title}</h1>
          {collection.description && <p className="mt-2 max-w-prose text-pretty text-muted">{collection.description}</p>}
        </div>
        <CopyLinkButton />
      </header>

      <GalleryWall
        pieces={collection.pieces}
        labels={labels}
        index={index}
        context={{ type: "collection", id: collection.id, title: collection.title, coverId: collection.coverId }}
        empty={
          <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-ink">Nothing in here yet</p>
            <p className="mt-1 text-sm text-muted">Pieces added to “{collection.title}” will show up here.</p>
          </div>
        }
      />

      <GalleryDialogs index={index} />
    </article>
  );
}
