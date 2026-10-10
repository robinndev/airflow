import { Suspense } from "react";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { PostCard } from "@/components/profile/post-card";
import { PostComposer } from "@/components/profile/post-composer";
import { getPosts, getProfile, normalizeHandle } from "@/lib/profile/queries";
import type { ArtistProfile } from "@/lib/profile/types";
import { getViewer } from "@/lib/session";

export default function ProfilePostsPage({ params }: PageProps<"/[handle]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Feed params={params} />
    </Suspense>
  );
}

async function Feed({ params }: Pick<PageProps<"/[handle]">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const [profile, posts] = await Promise.all([getProfile(handle), getPosts(handle)]);
  if (!profile) return null; // The layout renders not-found.

  return (
    <div className="grid gap-5">
      <Suspense>
        <OwnerComposer profile={profile} />
      </Suspense>

      <h2 className="sr-only">Posts</h2>
      {posts.length === 0 ? (
        <EmptyFeed name={profile.displayName} />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} author={profile} />)
      )}
    </div>
  );
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
