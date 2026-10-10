import Link from "next/link";
import { HandNote } from "@/components/explore/doodles";
import { Avatar } from "@/components/ui/avatar";
import { ProStar } from "@/components/ui/pro-badge";
import { formatLongDate, formatShortDate } from "@/lib/format";
import type { FeedEntry } from "@/lib/profile/queries";
import { AdoptableCard, CommissionTicket, PinnedReference } from "./note-embeds";
import { PostReactions } from "./post-reactions";
import { STAGES } from "./stages";

/** Palette of whatever a text-only post carries, for the room light and the like splash. */
export function notePalette({ embed, quote }: FeedEntry): string[] {
  if (embed?.type === "service") return embed.service.examples[0]?.palette ?? [];
  if (embed?.type === "adoptable") return embed.artwork.image.palette ?? [];
  return quote?.post.media[0]?.palette ?? [];
}

/**
 * Text-first posts (announcements, reposts) read as a signed note from the
 * studio, with whatever they point at — a commission, an adoptable, someone
 * else's piece — pinned beside it.
 */
export function StudioNote({ entry }: { entry: FeedEntry }) {
  const { post, author, embed, quote } = entry;
  const { icon: Icon } = STAGES.update;
  const attachment =
    embed?.type === "service" ? (
      <CommissionTicket embed={embed} />
    ) : embed?.type === "adoptable" ? (
      <AdoptableCard embed={embed} />
    ) : quote ? (
      <PinnedReference quote={quote} />
    ) : null;

  return (
    <article
      id={post.id}
      aria-labelledby={`${post.id}-by`}
      className="grain relative scroll-mt-24 rounded-panel border border-border/80 bg-surface/75 p-6 shadow-soft backdrop-blur-md sm:p-10"
    >
      <div className={attachment ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14" : ""}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
            <Icon aria-hidden className="size-3.5" />
            {quote ? "Pinned to the moodboard" : "Studio note"}
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt} title={formatLongDate(post.createdAt)}>
              {formatShortDate(post.createdAt)}
            </time>
          </p>

          <blockquote className="mt-4 font-display text-[1.625rem] leading-[1.18] font-bold tracking-[-0.015em] text-balance text-ink sm:text-[2rem]">
            {post.body}
          </blockquote>

          <footer className="mt-6 flex items-center gap-3">
            <Link href={`/${author.handle}`} className="group/avatar relative shrink-0 rounded-full">
              <Avatar image={author.avatar} size={40} className="size-10 ring-2 ring-surface" />
              {author.plan === "pro" && <ProStar size="sm" />}
            </Link>
            <span className="flex min-w-0 flex-col items-start">
              <HandNote tone="accent" className="text-[1.75rem] leading-none">
                — {author.displayName.split(" ")[0]}
              </HandNote>
              <Link id={`${post.id}-by`} href={`/${author.handle}`} className="text-sm text-muted hover:text-ink hover:underline">
                <span className="sr-only">{author.displayName}, </span>@{author.handle}
              </Link>
            </span>
          </footer>

          <div className="mt-7">
            <PostReactions
              postId={post.id}
              handle={author.handle}
              likes={post.likes}
              comments={post.comments}
              colors={notePalette(entry)}
            />
          </div>
        </div>

        {attachment}
      </div>
    </article>
  );
}
