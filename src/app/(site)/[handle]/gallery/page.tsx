import Image from "next/image";
import { Suspense } from "react";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { getProfile, normalizeHandle } from "@/lib/profile/queries";

export const metadata = { title: "Gallery" };

export default function GalleryPage({ params }: PageProps<"/[handle]/gallery">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Gallery params={params} />
    </Suspense>
  );
}

async function Gallery({ params }: Pick<PageProps<"/[handle]/gallery">, "params">) {
  const profile = await getProfile(normalizeHandle((await params).handle));
  if (!profile) return null;

  return (
    <section>
      <SectionHeader
        handle={profile.handle}
        title="Gallery"
        description="Collections, tags and filters are coming next — here's a preview."
      />
      <ul className="columns-2 gap-3 sm:columns-3">
        {profile.gallery.preview.map((image) => (
          <li key={image.src} className="mb-3 break-inside-avoid">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1024px) 260px, 50vw"
              className="h-auto w-full rounded-card border border-border bg-ice"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
