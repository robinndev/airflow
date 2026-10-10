import Image from "next/image";
import Link from "next/link";
import { Brush, Clock, Tag } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatShortDate, formatUsd } from "@/lib/format";
import type { FeedEntry, ResolvedEmbed } from "@/lib/profile/queries";

const shell =
  "mt-3 flex overflow-hidden rounded-[18px] border border-border bg-surface transition-colors hover:border-sky/60 hover:bg-canvas/60";

/** Marketplace card inside a post: the bridge from content to a sale. */
export function PostEmbedCard({ embed }: { embed: ResolvedEmbed }) {
  if (embed.type === "service") {
    const { service, status, slotsLeft } = embed;
    const cover = service.examples[0];
    const open = status === "open";
    return (
      <Link href={`/${service.ownerHandle}/commissions#${service.id}`} className={`group ${shell}`}>
        {cover && (
          <span className="relative w-32 shrink-0 bg-ice sm:w-40">
            <Image
              src={cover.src}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
              style={{ objectPosition: cover.focus ?? "50% 25%" }}
            />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col p-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
            <Brush aria-hidden className="size-3.5" />
            Commission · {open ? `${slotsLeft} slots left` : status === "waitlist" ? "Waitlist" : "Closed"}
          </span>
          <span className="mt-1 truncate font-display text-base font-bold text-ink">{service.title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <span>
              from <span className="font-semibold text-ink">{formatUsd(service.priceFromUsd)}</span>
            </span>
            {service.discountPercent && (
              <span className="rounded-full bg-lilac/12 px-1.5 text-xs font-semibold text-lilac-ink">
                -{service.discountPercent}%
              </span>
            )}
          </span>
          <span className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock aria-hidden className="size-3.5" />
              {service.turnaround}
            </span>
            <span className="rounded-full bg-ocean px-3.5 py-1.5 text-xs font-semibold text-white transition group-hover:brightness-95">
              {open ? "Request" : "View"}
            </span>
          </span>
        </span>
      </Link>
    );
  }

  const { artwork } = embed;
  const sold = artwork.adopt?.status === "sold";
  return (
    <Link href={`/${artwork.ownerHandle}/gallery`} className={`group ${shell} flex-col sm:flex-row`}>
      <span className="relative aspect-[4/3] w-full shrink-0 bg-ice sm:aspect-auto sm:w-48">
        <Image
          src={artwork.image.src}
          alt={artwork.image.alt}
          fill
          sizes="(min-width: 640px) 192px, 100vw"
          className="object-cover"
          style={{ objectPosition: artwork.image.focus ?? "50% 25%" }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col p-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-lilac-ink">
          <Tag aria-hidden className="size-3.5" />
          Adoptable · {sold ? "Sold" : "Available"}
        </span>
        <span className="mt-1 truncate font-display text-base font-bold text-ink">{artwork.title}</span>
        <span className="mt-0.5 text-sm text-muted">
          Ref sheet + commercial rights
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          {artwork.adopt && (
            <span className="font-display text-lg font-extrabold text-ink">
              {formatUsd(artwork.adopt.priceUsd)}
            </span>
          )}
          <span
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition group-hover:brightness-95 ${
              sold ? "bg-ice text-muted" : "bg-lilac text-white"
            }`}
          >
            {sold ? "See details" : "Adopt"}
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Repost with comment: a compact, clickable copy of the original. */
export function QuotedPost({ quote }: { quote: NonNullable<FeedEntry["quote"]> }) {
  const { post, author } = quote;
  const cover = post.media[0];
  return (
    <Link
      href={`/${author.handle}#${post.id}`}
      className="mt-3 block overflow-hidden rounded-[18px] border border-border transition-colors hover:bg-canvas/60"
    >
      <span className="flex items-center gap-2 px-4 pt-3 text-sm">
        <Avatar image={author.avatar} size={20} className="size-5" />
        <span className="truncate font-bold text-ink">{author.displayName}</span>
        <span className="truncate text-muted">@{author.handle}</span>
        <span aria-hidden className="text-muted">·</span>
        <span className="shrink-0 text-muted">{formatShortDate(post.createdAt)}</span>
      </span>
      <span className="line-clamp-3 px-4 pt-1 pb-3 text-sm leading-relaxed text-ink/90">
        {post.body}
      </span>
      {cover && (
        <span className="relative block aspect-[16/9] bg-ice">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
            style={{ objectPosition: cover.focus ?? "50% 40%" }}
          />
        </span>
      )}
    </Link>
  );
}
