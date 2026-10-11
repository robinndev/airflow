import Link from "next/link";
import { Suspense } from "react";
import { PenLine } from "lucide-react";
import { AboutBoard } from "@/components/about/about-board";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { PostCard } from "@/components/profile/post-card";
import { PostComposer } from "@/components/profile/post-composer";
import { CommentsPanel } from "@/components/social/comments-panel";
import { RepostDialog } from "@/components/social/repost-dialog";
import { buttonClasses } from "@/components/ui/button";
import { getPosts, getProfile, normalizeHandle } from "@/lib/profile/queries";
import type { ArtistProfile, Post } from "@/lib/profile/types";
import { getViewer } from "@/lib/session";

export default function ProfilePostsPage({ params }: PageProps<"/[handle]">) {
  return (
    <>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed params={params} />
      </Suspense>
      <CommentsPanel />
      <RepostDialog />
    </>
  );
}

async function Feed({ params }: Pick<PageProps<"/[handle]">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const [profile, posts] = await Promise.all([getProfile(handle), getPosts(handle)]);
  if (!profile) return null; // The layout renders not-found.

  const board = profile.about;
  const hasBoard = (board?.blocks.length ?? 0) > 0;

  return (
    <div className="grid gap-5">
      {/* The artist's About board greets visitors first; posts follow. */}
      {hasBoard && board && (
        <section aria-labelledby="about-heading" className="mb-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="about-heading" className="font-display text-lg font-extrabold tracking-tight text-ink">
              About {profile.displayName}
            </h2>
            <Suspense>
              <EditBoardLink handle={profile.handle} />
            </Suspense>
          </div>
          <AboutBoard board={board} />
        </section>
      )}

      <Suspense>
        <OwnerComposer profile={profile} />
      </Suspense>

      <h2 className="sr-only">Posts</h2>
      {posts.length === 0 ? (
        <EmptyFeed name={profile.displayName} />
      ) : (
        // Posts prerender for everyone; each owner's "…" menu streams in on its own.
        <PostList posts={posts} author={profile} />
      )}
    </div>
  );
}

function PostList({ posts, author }: { posts: Post[]; author: ArtistProfile }) {
  return posts.map((post) => <PostCard key={post.id} post={post} author={author} authorId={author.id} />);
}

async function OwnerComposer({ profile }: { profile: ArtistProfile }) {
  const viewer = await getViewer();
  if (viewer?.handle !== profile.handle) return null;
  return (
    <PostComposer
      handle={profile.handle}
      displayName={profile.displayName}
      avatar={profile.avatar}
    />
  );
}

async function EditBoardLink({ handle }: { handle: string }) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  return (
    <Link href="/customize?tab=about" className={buttonClasses({ variant: "ghost", size: "sm" })}>
      <PenLine aria-hidden />
      Edit board
    </Link>
  );
}

function EmptyFeed({ name }: { name: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
      <p className="font-display text-lg font-bold text-ink">No posts yet</p>
      <p className="mt-1 text-sm text-muted">
        When {name} shares artwork, sketches or updates, they&apos;ll show up here.
      </p>
    </div>
  );
}
