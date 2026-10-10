import Link from "next/link";
import { Fragment, Suspense } from "react";
import { Sparkles } from "lucide-react";
import { FeedNav } from "@/components/feed/feed-nav";
import { FeedPost } from "@/components/feed/feed-post";
import {
  FeedSearch,
  OpenCommissions,
  SuggestedArtists,
  TrendingTags,
} from "@/components/feed/feed-widgets";
import { ViewerCard } from "@/components/feed/viewer-card";
import { PostComposer } from "@/components/profile/post-composer";
import { SiteHeader } from "@/components/site/site-header";
import { getFeed, getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { getFollowing } from "@/lib/social";

/*
 * Home feed, timeline-style. The three-column shell and cached widgets
 * prerender; the post list depends on the viewer (tab, follows, composer)
 * and streams in behind <Suspense>.
 */

type Tab = "for-you" | "following";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-[1184px] justify-center gap-6 sm:px-6 lg:grid-cols-[14rem_minmax(0,38rem)_20rem] xl:gap-8">
        <aside className="hidden lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:justify-between lg:py-5">
          <FeedNav />
          <Suspense fallback={<div className="h-14 animate-pulse rounded-full bg-surface" />}>
            <ViewerCard />
          </Suspense>
        </aside>

        <main className="min-h-[calc(100dvh-4rem)] min-w-0 border-border bg-surface sm:border-x">
          <h1 className="sr-only">Home feed</h1>
          <Suspense fallback={<TimelineSkeleton />}>
            <Feed searchParams={searchParams} />
          </Suspense>
        </main>

        <aside className="hidden lg:sticky lg:top-16 lg:grid lg:max-h-[calc(100dvh-4rem)] lg:gap-4 lg:self-start lg:overflow-y-auto lg:py-5 lg:[scrollbar-width:none]">
          <FeedSearch />
          <Suspense fallback={<div className="h-64 animate-pulse rounded-[20px] bg-surface" />}>
            <SuggestedArtists />
          </Suspense>
          <OpenCommissions />
          <TrendingTags />
          <p className="px-3 text-xs leading-relaxed text-muted">
            Terms · Privacy · Help · © 2026 Artiflow
          </p>
        </aside>
      </div>
    </>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const tab: Tab = params.feed === "following" ? "following" : "for-you";
  const viewer = await getViewer();
  const [entries, viewerProfile] = await Promise.all([
    getFeed(),
    viewer ? getProfile(viewer.handle) : null,
  ]);

  const following = new Set(viewer ? [viewer.handle, ...getFollowing(viewer.handle)] : []);
  const visible =
    tab === "following" ? entries.filter((e) => following.has(e.author.handle)) : entries;

  return (
    <>
      <FeedTabs tab={tab} />

      {viewerProfile && (
        <div id="composer" className="scroll-mt-32">
          <PostComposer
            variant="inline"
            handle={viewerProfile.handle}
            displayName={viewerProfile.displayName}
            avatar={viewerProfile.avatar}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-ink">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">
            Follow some artists and their posts will show up here.
          </p>
        </div>
      ) : (
        visible.map((entry, i) => (
          <Fragment key={entry.post.id}>
            <FeedPost entry={entry} />
            {/* Phones don't get the sidebar, so suggestions live inline. */}
            {i === 1 && (
              <div className="lg:hidden">
                <Suspense>
                  <SuggestedArtists variant="strip" />
                </Suspense>
              </div>
            )}
          </Fragment>
        ))
      )}

      {visible.length > 0 && (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-ice text-accent-strong">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <p className="font-display font-bold text-ink">You&apos;re all caught up</p>
          <Link
            href="/explore/popular"
            className="text-sm font-semibold text-accent-strong hover:underline"
          >
            Explore popular art
          </Link>
        </div>
      )}
    </>
  );
}

function FeedTabs({ tab }: { tab: Tab }) {
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "for-you", label: "For you", href: "/" },
    { key: "following", label: "Following", href: "/?feed=following" },
  ];
  return (
    <div className="sticky top-16 z-20 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md sm:px-5">
      <nav aria-label="Feed type" className="grid grid-cols-2 rounded-full bg-ice p-1">
        {tabs.map(({ key, label, href }) => {
          const active = key === tab;
          return (
            <Link
              key={key}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-full py-2 text-center text-sm font-semibold transition-all ${
                active
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.08),0_2px_8px_rgb(var(--shadow-rgb)/0.06)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-busy aria-label="Loading feed">
      <div className="h-[3.875rem] border-b border-border" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 border-b border-border px-5 py-4">
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-ice" />
          <div className="flex-1">
            <div className="h-4 w-40 animate-pulse rounded-input bg-ice" />
            <div className="mt-3 h-4 w-11/12 animate-pulse rounded-input bg-ice" />
            <div className="mt-4 aspect-[4/3] animate-pulse rounded-[18px] bg-ice" />
          </div>
        </div>
      ))}
    </div>
  );
}
