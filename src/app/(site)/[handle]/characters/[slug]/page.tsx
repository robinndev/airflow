import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ImagePlus, Pencil } from "lucide-react";
import { GalleryDialogs, GalleryWall, OwnerButton, ShowFor } from "@/components/gallery/owner/gallery-owner";
import { SectionLabel } from "@/components/gallery/paper";
import { RefSheet } from "@/components/gallery/ref-sheet";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { galleryIndex } from "@/lib/gallery/assemble";
import { getCharacter, getGallery } from "@/lib/gallery/queries";
import { CHARACTER_SECTIONS, sectionsOf } from "@/lib/gallery/types";
import { getAdoptables, getProfile, normalizeHandle } from "@/lib/profile/queries";

/*
 * A character's page: their reference sheet, their story, then their art in
 * sections (design, outfits, expressions & poses, alternate versions, art).
 * Lives inside the artist's profile, so it wears their customization.
 */

const hand = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export async function generateMetadata({ params }: PageProps<"/[handle]/characters/[slug]">): Promise<Metadata> {
  const { handle: raw, slug } = await params;
  const handle = normalizeHandle(raw);
  const character = await getCharacter(handle, slug);
  if (!character) return { title: "Character not found" };
  const title = `${character.name}, @${handle}'s character`;
  const description = character.tagline || character.story.slice(0, 160) || `${character.name} on Artiflow.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: character.cover
        ? [
            {
              url: character.cover.src,
              width: character.cover.width,
              height: character.cover.height,
            },
          ]
        : undefined,
    },
  };
}

export default function CharacterPage({ params }: PageProps<"/[handle]/characters/[slug]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CharacterView params={params} />
    </Suspense>
  );
}

async function CharacterView({ params }: Pick<PageProps<"/[handle]/characters/[slug]">, "params">) {
  const { handle: raw, slug } = await params;
  const handle = normalizeHandle(raw);
  const [profile, gallery, adoptables] = await Promise.all([getProfile(handle), getGallery(handle), getAdoptables(handle)]);
  const character = gallery.characters.find((c) => c.slug === slug);
  if (!profile || !character) notFound();

  const index = galleryIndex(gallery, {
    handle,
    ownerId: profile.id,
    adoptables,
  });
  const sections = sectionsOf(character);
  const sectionOf = Object.fromEntries(character.art.map((a) => [a.piece.id, a.section]));
  const context = {
    type: "character" as const,
    id: character.id,
    name: character.name,
    coverId: character.coverId,
    sections: sectionOf,
  };
  const ownerId = profile.id;
  const paragraphs = character.story.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <article className={`${hand.variable} space-y-10`} data-part="character">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${handle}/gallery#characters`}
          className="inline-flex items-center gap-1.5 rounded-input text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Gallery
        </Link>
        <div className="flex flex-wrap gap-2">
          <OwnerButton
            ownerId={ownerId}
            dialog={{
              type: "add-art",
              placement: {
                characters: [
                  {
                    id: character.id,
                    section: sections.length ? "art" : "design",
                  },
                ],
                collections: [],
              },
            }}
            className={buttonClasses({ size: "sm" })}
          >
            <ImagePlus aria-hidden />
            Add art of {character.name}
          </OwnerButton>
          <OwnerButton
            ownerId={ownerId}
            dialog={{ type: "character", characterId: character.id }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Pencil aria-hidden />
            Edit page
          </OwnerButton>
        </div>
      </div>

      <RefSheet character={character} ownerName={profile.displayName} />

      {paragraphs.length > 0 && (
        <section aria-labelledby="character-story" data-part="story">
          <SectionLabel id="character-story" title="Story" />
          <div className="max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-pretty text-ink first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:leading-[0.8] first-letter:font-extrabold first-letter:text-ocean">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`} id={section.id} className="scroll-mt-24">
          <SectionLabel
            id={`section-${section.id}`}
            title={section.label}
            count={section.pieces.length}
            hint={section.hint}
            action={
              <OwnerButton
                ownerId={ownerId}
                dialog={{
                  type: "add-art",
                  placement: {
                    characters: [{ id: character.id, section: section.id }],
                    collections: [],
                  },
                }}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <ImagePlus aria-hidden />
                Add
              </OwnerButton>
            }
          />
          <GalleryWall pieces={section.pieces} index={index} context={context} />
        </section>
      ))}

      {/* The artist's empty sections, as places to start. */}
      {sections.length < CHARACTER_SECTIONS.length && (
        <ShowFor ownerId={ownerId} always={false}>
          <div className="flex flex-wrap gap-2 rounded-card border-2 border-dashed border-border p-4">
            <p className="w-full text-sm text-muted">
              {sections.length ? "Start another section:" : `${character.name} has no art yet. Start with their design:`}
            </p>
            {CHARACTER_SECTIONS.filter((s) => !sections.some((x) => x.id === s.id)).map((s) => (
              <OwnerButton
                key={s.id}
                ownerId={ownerId}
                dialog={{
                  type: "add-art",
                  placement: {
                    characters: [{ id: character.id, section: s.id }],
                    collections: [],
                  },
                }}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <ImagePlus aria-hidden />
                {s.label}
              </OwnerButton>
            ))}
          </div>
        </ShowFor>
      )}

      <GalleryDialogs index={index} />
    </article>
  );
}
