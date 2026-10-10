import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostOwnerMenu } from "@/components/profile/post-owner-menu";
import { CommentsButton } from "@/components/social/comments-button";
import { commentsTarget, repostTarget } from "@/components/social/targets";
import { Avatar } from "@/components/ui/avatar";
import { formatCompact, formatLongDate, formatShortDate } from "@/lib/format";
import { MOODS, moodsOf } from "@/lib/palette";
import type { FeedEntry } from "@/lib/profile/queries";
import type { PostKind } from "@/lib/profile/types";
import { ArtPlate, type PlateVariant } from "./art-plate";
import { PaletteChips } from "./palette-chips";
import { PostReactions } from "./post-reactions";
import { PROCESS, STAGES } from "./stages";

const PLATE: Record<PostKind, PlateVariant> = {
  finished: "gallery",
  update: "gallery",
  wip: "drafting",
  sketch: "sketchbook",
};

/** First paragraph reads as the piece's title; the rest is the artist's note. */
export function splitCaption(body: string) {
  const [lead, ...rest] = body.trim().split(/(?:\r?\n){2,}/);
  return { lead, rest: rest.join("\n\n") };
}

/**
 * One piece, hung like a plate in an art book: the artwork on one side, its
 * wall label on the other — alternating down the feed. On phones the label
 * splits around the art: who made it above, the note and reactions below.
 */
export function ArtPost({
  entry,
  flip,
  priority,
  canManage = false,
}: {
  entry: FeedEntry;
  flip: boolean;
  priority?: boolean;
  /** The viewer wrote this post: show the "…" menu (delete). */
  canManage?: boolean;
}) {
  const { post, author, studio } = entry;
  const palette = post.media[0]?.palette ?? [];
  const mood = MOODS.find((m) => m.slug === moodsOf(palette)[0]);
  const { lead, rest } = splitCaption(post.body);
  const profileHref = `/${author.handle}`;

  return (
    <article
      id={post.id}
      aria-labelledby={`${post.id}-by`}
      className={`flex scroll-mt-24 flex-col gap-5 lg:grid lg:items-center lg:gap-14 xl:gap-20 ${
        flip ? "lg:grid-cols-[20rem_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_20rem]"
      }`}
    >
      <div className={`order-2 ${flip ? "lg:order-2" : "lg:order-1"}`}>
        <ArtPlate media={post.media} variant={PLATE[post.kind]} align={flip ? "start" : "end"} priority={priority} />
      </div>

      <aside className={`contents lg:block ${flip ? "lg:order-1" : "lg:order-2"}`}>
        <header className="order-1 flex items-center gap-3">
          <Link href={profileHref} className="group/avatar relative shrink-0 rounded-full">
            <Avatar image={author.avatar} size={44} className="size-11 ring-2 ring-surface" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.0625rem] leading-tight font-bold text-ink">
              <Link id={`${post.id}-by`} href={profileHref} className="hover:underline">
                {author.displayName}
              </Link>
            </p>
            <p className="truncate text-sm text-muted">
              @{author.handle} ·{" "}
              <time dateTime={post.createdAt} title={formatLongDate(post.createdAt)}>
                {formatShortDate(post.createdAt)}
              </time>
            </p>
          </div>
          {canManage && <PostOwnerMenu postId={post.id} />}
        </header>

        <div className="order-3 lg:mt-6">
          <p
            className={`font-display leading-snug font-bold text-balance text-ink ${
              lead.length > 110 ? "text-lg" : "text-[1.375rem] tracking-[-0.01em]"
            }`}
          >
            {lead}
          </p>
          {rest && <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-line text-ink/80">{rest}</p>}

          <dl className="mt-5 grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3.5 border-t border-dashed border-ink/15 pt-4">
            <dt className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Stage</dt>
            <dd>
              <StageTrack kind={post.kind} />
            </dd>
            {palette.length > 0 && (
              <>
                <dt className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Palette</dt>
                <dd className="flex min-w-0 items-center gap-3">
                  <PaletteChips colors={palette} />
                  {mood && (
                    <Link
                      href="/explore#wall-heading"
                      title={`More ${mood.name.toLowerCase()} art`}
                      className="truncate text-xs text-muted transition-colors hover:text-ink"
                    >
                      {mood.name}
                    </Link>
                  )}
                </dd>
              </>
            )}
          </dl>

          <div className="mt-5">
            <PostReactions
              postId={post.id}
              handle={author.handle}
              likes={post.likes}
              comments={post.comments}
              reposts={post.reposts}
              colors={palette}
              conversation={commentsTarget(post, author)}
              repost={repostTarget(post, author)}
              askingForFeedback={post.kind === "wip" || post.kind === "sketch"}
            />
          </div>

          {post.latestComment && <MarginNote entry={entry} />}

          {studio.status === "open" && (
            <Link
              href={`${profileHref}/commissions`}
              className="group mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-mint-dot" />
              </span>
              <span className="underline-offset-4 group-hover:underline">
                Commission {author.displayName.split(" ")[0]} · {studio.slotsLeft} {studio.slotsLeft === 1 ? "slot" : "slots"} left
              </span>
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </aside>
    </article>
  );
}

/** Sketch → in progress → finished, with the piece's current stage lit. */
function StageTrack({ kind }: { kind: PostKind }) {
  if (!PROCESS.includes(kind)) {
    const { icon: Icon, label } = STAGES[kind];
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </span>
    );
  }

  const current = PROCESS.indexOf(kind);
  return (
    <ol className="flex items-center">
      {PROCESS.map((stage, i) => {
        const { icon: Icon, label } = STAGES[stage];
        const isCurrent = i === current;
        return (
          <li key={stage} className="flex items-center" aria-current={isCurrent ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden
                className={`mx-1 h-px w-3 sm:w-4 ${i <= current ? "bg-ink/40" : "border-t border-dashed border-ink/20 bg-transparent"}`}
              />
            )}
            <span
              title={label}
              className={`inline-flex h-6 items-center gap-1 rounded-full text-xs font-semibold ${
                isCurrent
                  ? "bg-ink px-2.5 text-on-ink"
                  : i < current
                    ? "w-6 justify-center bg-ink/8 text-ink"
                    : "w-6 justify-center border border-dashed border-ink/25 text-muted/70"
              }`}
            >
              <Icon aria-hidden className="size-3" />
              <span className={isCurrent ? "" : "sr-only"}>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The newest comment, scribbled in the margin. Opens the whole conversation. */
function MarginNote({ entry }: { entry: FeedEntry }) {
  const { post, author } = entry;
  const comment = post.latestComment;
  if (!comment) return null;

  return (
    <CommentsButton target={commentsTarget(post, author)} className="group mt-6 flex gap-3 text-left">
      <Avatar image={comment.author.avatar} size={28} className="mt-1 size-7" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-muted">@{comment.author.handle} wrote</span>
        <span className="mt-0.5 line-clamp-4 -rotate-1 font-hand text-[1.375rem] leading-[1.1] font-semibold text-pretty text-lilac-ink">
          “{comment.body}”
        </span>
        <span className="mt-1.5 block text-xs font-medium text-muted group-hover:text-ink group-hover:underline">
          {post.comments > 1 ? `Read all ${formatCompact(post.comments)} comments` : "Reply"}
        </span>
      </span>
    </CommentsButton>
  );
}
