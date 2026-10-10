import Link from "next/link";
import { Suspense } from "react";
import { Ellipsis, Pin, Repeat2 } from "lucide-react";
import { PinnedReference } from "@/components/feed/note-embeds";
import { commentsTarget, repostTarget } from "@/components/social/targets";
import { Avatar } from "@/components/ui/avatar";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { POST_KINDS } from "@/lib/profile/post-kinds";
import type { Post, PostAuthor } from "@/lib/profile/types";
import { getViewer } from "@/lib/session";
import { PostActions } from "./post-actions";
import { PostMedia } from "./post-media";
import { PostOwnerMenu } from "./post-owner-menu";

export function PostCard({
  post,
  author,
  authorId,
}: {
  post: Post;
  author: PostAuthor;
  /** The author's account id: their own (real) posts get the delete menu, streamed in. */
  authorId: string;
}) {
  const kind = POST_KINDS[post.kind];

  return (
    <article
      id={post.id}
      aria-labelledby={`${post.id}-author`}
      className="scroll-mt-24 rounded-card border border-border bg-surface shadow-soft"
    >
      {post.pinned && (
        <p className="flex items-center gap-1.5 px-5 pt-4 text-xs font-semibold text-muted">
          <Pin aria-hidden className="size-3.5 rotate-45" />
          Pinned
        </p>
      )}

      <header className={`flex items-start gap-3 px-5 ${post.pinned ? "pt-3" : "pt-5"}`}>
        <Link
          href={`/${author.handle}`}
          className="group/avatar relative shrink-0 rounded-full"
        >
          <Avatar image={author.avatar} size={44} className="size-11" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              id={`${post.id}-author`}
              href={`/${author.handle}`}
              className="font-display text-[0.9375rem] font-bold text-ink hover:underline"
            >
              {author.displayName}
            </Link>
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted">
            <span>@{author.handle}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt} title={formatLongDate(post.createdAt)}>
              {formatShortDate(post.createdAt)}
            </time>
          </p>
        </div>

        <span
          className={`mt-0.5 hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${kind.className}`}
        >
          {kind.label}
        </span>
        {/* Only the menu waits for the session; the post itself never re-renders. */}
        <Suspense fallback={<MoreOptions />}>
          <PostMenu postId={post.id} authorId={authorId} />
        </Suspense>
      </header>

      <div className="px-5 pt-3">
        <span
          className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold sm:hidden ${kind.className}`}
        >
          {kind.label}
        </span>
        {post.quoted && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Repeat2 aria-hidden className="size-3.5" />
            Reposted from @{post.quoted.author.handle}
          </p>
        )}
        {post.body && (
          <p className="text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-line text-ink">{post.body}</p>
        )}
      </div>

      {post.quoted && (
        <div className="px-5 pt-5 pb-2">
          <PinnedReference quote={post.quoted} />
        </div>
      )}

      {post.media.length > 0 && (
        <div className="px-3 pt-4 sm:px-5">
          <div className="overflow-hidden rounded-[14px]">
            <PostMedia media={post.media} />
          </div>
        </div>
      )}

      <PostActions
        postId={post.id}
        handle={author.handle}
        likes={post.likes}
        comments={post.comments}
        reposts={post.reposts}
        conversation={commentsTarget(post, author)}
        repost={repostTarget(post, author)}
      />
    </article>
  );
}

async function PostMenu({ postId, authorId }: { postId: string; authorId: string }) {
  const viewer = await getViewer();
  return viewer?.id === authorId ? <PostOwnerMenu postId={postId} /> : <MoreOptions />;
}

function MoreOptions() {
  return (
    <button
      type="button"
      aria-label="More options"
      className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
    >
      <Ellipsis aria-hidden className="size-5" />
    </button>
  );
}
