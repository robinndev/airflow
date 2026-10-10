import Link from "next/link";
import { Caveat } from "next/font/google";
import { Fragment, Suspense, type ReactNode } from "react";
import { HandNote, Scribble, Sparkle } from "@/components/explore/doodles";
import { ArtPost } from "@/components/feed/art-post";
import { CanvasComposer } from "@/components/feed/canvas-composer";
import { FeedFilters, type FeedTab } from "@/components/feed/feed-filters";
import { FeedLight } from "@/components/feed/feed-light";
import { FEED_LIGHT_ID, type LightStop } from "@/components/feed/light";
import { OpenStudios, StudioVisit, TagMarquee } from "@/components/feed/interludes";
import { parseStage, STAGES } from "@/components/feed/stages";
import { notePalette, StudioNote } from "@/components/feed/studio-note";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { getExploreData, TAGS } from "@/lib/explore";
import { glowOf } from "@/lib/palette";
import { getAllProfiles, getFeed, getProfile, type FeedEntry } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { getFollowing } from "@/lib/social";

// The artist's handwriting: margin notes, signatures, asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

const container = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

/*
 * Home feed, hung like an exhibition. The room is lit by the artwork in view
 * (#feed-light), pieces alternate sides like plates in an art book, and
 * discovery comes as interludes between them. The masthead prerenders; the
 * pieces depend on the viewer (tab, stage, follows) and stream in.
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <SiteHeader frosted />
      <main className={`${hand.variable} relative isolate flex-1 overflow-x-clip pb-32`}>
        <div id={FEED_LIGHT_ID} aria-hidden className="ambient-light pointer-events-none fixed inset-0 -z-10">
          <div className="grain size-full" />
        </div>

        <header className={`${container} relative pt-10 sm:pt-14`}>
          <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-mint-dot" />
            </span>
            The studio feed
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.035em] text-ink sm:text-[3.5rem]">
            Fresh off the{" "}
            <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
              easel.
              <Scribble className="absolute -bottom-1.5 left-[-4%] w-[108%] text-mint" />
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted sm:text-base">
            Sketches, works in progress and finished pieces, hung the moment they leave the studio. The room
            takes the color of whatever you&apos;re looking at.
          </p>
          <Sparkle className="absolute top-12 right-[8%] hidden size-6 text-lilac sm:block" />
          <Sparkle className="absolute top-32 right-[16%] hidden size-3.5 text-mint sm:block" />
        </header>

        <div className={`${container} mt-10`}>
          <Suspense fallback={<FeedSkeleton />}>
            <Feed searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const tab: FeedTab = params.feed === "following" ? "following" : "for-you";
  const stage = parseStage(params.stage);
  const viewer = await getViewer();
  const [entries, viewerProfile, profiles, explore] = await Promise.all([
    getFeed(),
    viewer ? getProfile(viewer.handle) : null,
    getAllProfiles(),
    getExploreData(),
  ]);

  const following = new Set(viewer ? [viewer.handle, ...getFollowing(viewer.handle)] : []);
  const visible = entries.filter(
    (e) => (tab === "for-you" || following.has(e.author.handle)) && (!stage || e.post.kind === stage),
  );
  const newcomer = profiles.find((p) => !following.has(p.handle));
  const studios = explore.studios.filter((s) => s.status !== "soon").slice(0, 4);

  // Interludes slot in after these positions, when the feed is long enough.
  const interludes: Record<number, ReactNode> = {
    1: <OpenStudios studios={studios} />,
    4: newcomer && <StudioVisit profile={newcomer} />,
    7: <TagMarquee tags={TAGS.slice(0, 12)} />,
  };

  // Pieces alternate sides; notes don't count, so the rhythm holds around them.
  const flipped = visible.map((_, i) => visible.slice(0, i).filter((e) => e.post.media.length > 0).length % 2 === 1);

  return (
    <>
      <FeedFilters tab={tab} stage={stage} />

      {viewerProfile && (
        <div className="mt-8">
          <CanvasComposer
            handle={viewerProfile.handle}
            displayName={viewerProfile.displayName}
            avatar={viewerProfile.avatar}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyWall following={tab === "following"} stage={stage ? STAGES[stage].filter.toLowerCase() : null} />
      ) : (
        <div className="mt-16 flex flex-col gap-24 lg:gap-36">
          {visible.map((entry, i) => (
            <Fragment key={entry.post.id}>
              {entry.post.media.length > 0 ? (
                <ArtPost entry={entry} flip={flipped[i]} priority={i === 0} canManage={entry.author.handle === viewer?.handle} />
              ) : (
                <StudioNote entry={entry} canManage={entry.author.handle === viewer?.handle} />
              )}
              {interludes[i]}
            </Fragment>
          ))}
          <FeedEnd />
        </div>
      )}

      <FeedLight stops={visible.flatMap(toLightStop)} />
    </>
  );
}

function toLightStop(entry: FeedEntry): LightStop[] {
  const swatches = entry.post.media[0]?.palette ?? notePalette(entry);
  if (swatches.length === 0) return [];
  return [
    {
      id: entry.post.id,
      glow: glowOf(swatches),
      swatches,
      label: `${entry.author.displayName} · ${STAGES[entry.post.kind].label}`,
    },
  ];
}

function FeedEnd() {
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <HandNote tone="accent" className="-rotate-3 text-[2.75rem]">
        fin.
      </HandNote>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">You&apos;ve seen every new piece.</p>
      <p className="mt-2 max-w-sm text-[0.9375rem] text-muted">
        Go find someone new to follow — the Explore wall is always hanging something.
      </p>
      <Link href="/explore" className={buttonClasses({ size: "lg", className: "mt-6" })}>
        Wander the Explore wall
      </Link>
    </div>
  );
}

function EmptyWall({ following, stage }: { following: boolean; stage: string | null }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <HandNote className="-rotate-2 text-[1.75rem]">an empty wall…</HandNote>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">
        {stage ? `No ${stage} here yet` : "Nothing hanging here yet"}
      </p>
      <p className="mt-2 text-[0.9375rem] text-muted">
        {following
          ? "Follow a few artists and their new work will be hung here first."
          : "Check back soon — artists post new work every day."}
      </p>
      <Link href="/explore" className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        Find artists to follow
      </Link>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy aria-label="Loading feed">
      <div className="flex justify-between gap-6">
        <div className="h-8 w-56 animate-pulse rounded-input bg-ice" />
        <div className="hidden h-9 w-96 animate-pulse rounded-full bg-ice md:block" />
      </div>
      <div className="mt-8 h-[5.5rem] animate-pulse rounded-panel bg-ice/70" />
      <div className="mt-24 grid gap-14 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="ml-auto aspect-4/5 w-full max-w-[34rem] animate-pulse rounded-[10px] bg-ice" />
        <div className="self-center">
          <div className="h-11 w-44 animate-pulse rounded-full bg-ice" />
          <div className="mt-6 h-6 w-full animate-pulse rounded-input bg-ice" />
          <div className="mt-2 h-6 w-2/3 animate-pulse rounded-input bg-ice" />
          <div className="mt-6 h-16 w-full animate-pulse rounded-input bg-ice/70" />
        </div>
      </div>
    </div>
  );
}
