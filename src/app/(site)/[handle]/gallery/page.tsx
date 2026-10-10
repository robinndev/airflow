import { Suspense } from "react";
import { ArtworkCard } from "@/components/profile/artwork-card";
import { GalleryFilter } from "@/components/profile/gallery-filter";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { getArtworks, normalizeHandle } from "@/lib/profile/queries";

export const metadata = { title: "Gallery" };

export default function GalleryPage({ params }: PageProps<"/[handle]/gallery">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Gallery params={params} />
    </Suspense>
  );
}

async function Gallery({ params }: Pick<PageProps<"/[handle]/gallery">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const artworks = await getArtworks(handle);

  const counts = {
    all: artworks.length,
    commission: artworks.filter((a) => a.kind === "commission").length,
    personal: artworks.filter((a) => a.kind === "personal").length,
    adoptable: artworks.filter((a) => a.kind === "adoptable").length,
  };

  return (
    <section>
      <SectionHeader
        handle={handle}
        title="Gallery"
        description="Finished pieces, commissions and adoptables."
      />
      {artworks.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">No artworks yet</p>
          <p className="mt-1 text-sm text-muted">Uploaded pieces will show up here.</p>
        </div>
      ) : (
        <GalleryFilter counts={counts}>
          <ul className="columns-2 gap-4 sm:columns-3 sm:gap-5">
            {artworks.map((artwork, i) => (
              <ArtworkCard key={artwork.id} artwork={artwork} priority={i < 3} />
            ))}
          </ul>
        </GalleryFilter>
      )}
    </section>
  );
}
