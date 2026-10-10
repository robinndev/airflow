import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { PostMedia } from "@/components/profile/post-media";
import { Avatar } from "@/components/ui/avatar";
import { ProStar } from "@/components/ui/pro-badge";
import { formatCompact, formatLongDate, formatShortDate } from "@/lib/format";
import type { FeedEntry } from "@/lib/profile/queries";
import type { PostKind } from "@/lib/profile/types";
import { FeedPostActions } from "./feed-post-actions";
import { PostEmbedCard, QuotedPost } from "./post-embeds";

// Kept quiet on purpose: a colored dot + word next to the date.
const KIND_META: Record<PostKind, { label: string; dot: string }> = {
  finished: { label: "Finished", dot: "bg-ocean" },
  wip: { label: "WIP", dot: "bg-lilac" },
  sketch: { label: "Sketch", dot: "bg-sky" },
  update: { label: "Update", dot: "bg-mint" },
};

/** Timeline row: avatar gutter on the left, content on the right, divider below. */
export function FeedPost({ entry }: { entry: FeedEntry }) {
  const { post, author, embed, quote, commentAuthor } = entry;
  const kind = KIND_META[post.kind];
  const profileHref = `/${author.handle}`;

  return (
    <article
      id={post.id}
      aria-labelledby={`${post.id}-author`}
      className="flex gap-3 border-b border-border px-4 pt-4 pb-1.5 transition-colors hover:bg-canvas/60 sm:px-5"
    >
      <Link href={profileHref} className="relative h-fit shrink-0 rounded-full">
        <Avatar image={author.avatar} size={44} className="size-11" />
        {author.plan === "pro" && <ProStar size="sm" />}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[0.9375rem] leading-tight">
            <Link
              id={`${post.id}-author`}
              href={profileHref}
              className="truncate font-display font-bold text-ink hover:underline"
            >
              {author.displayName}
            </Link>
            <span className="truncate text-muted">@{author.handle}</span>
            <span aria-hidden className="text-muted">·</span>
            <time
              dateTime={post.createdAt}
              title={formatLongDate(post.createdAt)}
              className="text-muted hover:underline"
            >
              {formatShortDate(post.createdAt)}
            </time>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
              <span aria-hidden className={`size-1.5 rounded-full ${kind.dot}`} />
              {kind.label}
            </span>
          </p>
          <button
            type="button"
            aria-label="More options"
            className="-mt-1.5 -mr-2 grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
          >
            <Ellipsis aria-hidden className="size-[1.125rem]" />
          </button>
        </div>

        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-line text-ink">
          {post.body}
        </p>

        {post.media.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-[18px] border border-border">
            <PostMedia media={post.media} />
          </div>
        )}
        {embed && <PostEmbedCard embed={embed} />}
        {quote && <QuotedPost quote={quote} />}

        <FeedPostActions
          postId={post.id}
          handle={author.handle}
          likes={post.likes}
          comments={post.comments}
          reposts={Math.round(post.likes / 9)}
        />

        {post.topComment && (
          <Link
            href={`${profileHref}#${post.id}`}
            className="mb-2.5 block rounded-[14px] bg-canvas px-3.5 py-2.5 transition-colors hover:bg-ice/70"
          >
            <span className="flex items-start gap-2.5 text-sm">
              {commentAuthor ? (
                <Avatar image={commentAuthor.avatar} size={24} className="mt-px size-6" />
              ) : (
                <span
                  aria-hidden
                  className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-lilac/20 text-[0.625rem] font-bold text-lilac-ink uppercase"
                >
                  {post.topComment.author.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0 leading-snug text-ink/90">
                <span className="font-semibold text-ink">@{post.topComment.author}</span>{" "}
                {post.topComment.text}
              </span>
            </span>
            <span className="mt-1.5 block pl-8.5 text-xs font-medium text-muted">
              View all {formatCompact(post.comments)} comments
            </span>
          </Link>
        )}
      </div>
    </article>
  );
}
