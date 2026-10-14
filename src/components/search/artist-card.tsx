import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { artistLabels } from "@/lib/profile/draws";
import { formatCompact, formatUsd } from "@/lib/format";
import type { ArtistHit } from "@/lib/search/query";

const STATUS = {
  open: { label: "Taking commissions", dot: "bg-mint-dot", text: "text-mint-ink" },
  waitlist: { label: "Waitlist", dot: "bg-lilac", text: "text-lilac-ink" },
  closed: { label: "Not taking commissions", dot: "bg-muted", text: "text-muted" },
} as const;

/**
 * An artist as a business card handed across the table: their cover as the
 * card's print, the face, what they draw, and whether they're taking work.
 */
export function ArtistCard({ artist, priority = false }: { artist: ArtistHit; priority?: boolean }) {
  const status = STATUS[artist.commissions];
  const labels = artistLabels(artist.draws).slice(0, 3);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-soft transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative h-20 bg-ice" style={{ backgroundColor: artist.banner?.palette?.[0] ?? artist.avatar.palette?.[0] }}>
        {(artist.banner ?? artist.avatar) && (
          <Image
            src={(artist.banner ?? artist.avatar).src}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 300px, 50vw"
            className={`object-cover ${artist.banner ? "" : "scale-150 blur-xl saturate-150"}`}
          />
        )}
      </div>
      <div className="relative -mt-8 flex flex-1 flex-col px-4 pb-4">
        <Avatar image={{ ...artist.avatar, alt: "" }} size={64} className="size-16 ring-4 ring-surface" />
        <h3 className="mt-2 flex items-center gap-1 font-display text-[1.0625rem] leading-tight font-extrabold text-ink">
          <Link href={artist.href} className="truncate after:absolute after:inset-0 hover:underline">
            {artist.name}
          </Link>
          {artist.isPro && <BadgeCheck aria-label="Flow+" className="size-4 shrink-0 fill-lilac text-surface" />}
        </h3>
        <p className="truncate text-sm text-muted">@{artist.handle}</p>
        {artist.headline && <p className="mt-1.5 line-clamp-2 text-sm text-ink/80">{artist.headline}</p>}
        {labels.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1">
            {labels.map((l) => (
              <li key={l.tag} className="rounded-full bg-lilac/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-lilac-ink">
                {l.label}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-border pt-3 text-xs">
          <span className={`inline-flex items-center gap-1.5 font-semibold ${status.text}`}>
            <span aria-hidden className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          {artist.fromUsd !== undefined && artist.commissions !== "closed" && (
            <span className="text-muted">starting at <span className="font-bold text-ink">{formatUsd(artist.fromUsd)}</span></span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-muted">
            <Users aria-hidden className="size-3.5" />
            {formatCompact(artist.followers)}
          </span>
        </div>
        </div>
      </div>
    </article>
  );
}
