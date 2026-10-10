import Image from "next/image";
import { BadgeCheck, Heart, Tag } from "lucide-react";
import { formatCompact, formatUsd } from "@/lib/format";
import type { Artwork, ArtworkKind } from "@/lib/profile/types";
import { ArtworkLikeButton } from "./artwork-like-button";

// Hides the card when a different filter is active (see GalleryFilter) — pure CSS, no re-render.
const HIDE_WHEN_FILTERED: Record<ArtworkKind, string> = {
  commission:
    "group-data-[filter=personal]/gallery:hidden group-data-[filter=adoptable]/gallery:hidden",
  personal:
    "group-data-[filter=commission]/gallery:hidden group-data-[filter=adoptable]/gallery:hidden",
  adoptable:
    "group-data-[filter=commission]/gallery:hidden group-data-[filter=personal]/gallery:hidden",
};

const badgeBase =
  "absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-soft backdrop-blur-sm [&_svg]:size-3.5";

export function ArtworkCard({ artwork, priority }: { artwork: Artwork; priority?: boolean }) {
  const { image, title } = artwork;

  return (
    <li className={`mb-5 break-inside-avoid ${HIDE_WHEN_FILTERED[artwork.kind]}`}>
      <figure>
        <div className="group/art relative overflow-hidden rounded-card bg-ice ring-1 ring-border/70">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            preload={priority}
            sizes="(min-width: 1184px) 245px, (min-width: 640px) 30vw, 50vw"
            className="h-auto w-full transition-transform duration-500 ease-out group-hover/art:scale-[1.03]"
          />
          <ArtworkBadge artwork={artwork} />
          <ArtworkLikeButton title={title} />
        </div>
        <figcaption className="mt-2.5 px-1">
          <p className="truncate font-display text-[0.9375rem] font-bold text-ink">{title}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            {artwork.client && <span className="truncate">for @{artwork.client}</span>}
            <span className="inline-flex shrink-0 items-center gap-1">
              <Heart aria-hidden className="size-3" />
              <span className="tabular-nums">{formatCompact(artwork.likes)}</span>
              <span className="sr-only">favorites</span>
            </span>
          </p>
        </figcaption>
      </figure>
    </li>
  );
}

function ArtworkBadge({ artwork }: { artwork: Artwork }) {
  if (artwork.kind === "commission") {
    return (
      <span className={`${badgeBase} bg-surface/90 text-ink`}>
        <BadgeCheck aria-hidden className="text-mint-strong" />
        Commission
      </span>
    );
  }

  if (artwork.kind === "adoptable" && artwork.adopt) {
    return artwork.adopt.status === "sold" ? (
      <span className={`${badgeBase} bg-scrim/80 text-white`}>Sold</span>
    ) : (
      <span className={`${badgeBase} bg-surface/90 text-ink`}>
        <Tag aria-hidden className="text-lilac-ink" />
        Adoptable · {formatUsd(artwork.adopt.priceUsd)}
      </span>
    );
  }

  return null; // Personal work stays clean so commissions stand out.
}
