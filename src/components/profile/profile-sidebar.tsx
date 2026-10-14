import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Brush, Clock, LayoutGrid, Link2, Tag } from "lucide-react";
import { SocialIcon } from "@/components/icons/social-icon";
import { buttonClasses } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import type { ArtistProfile } from "@/lib/profile/types";

export function ProfileSidebar({ profile }: { profile: ArtistProfile }) {
  return (
    <div className="grid gap-4">
      {/* A collector (no artist access) doesn't sell: no commissions card. */}
      {profile.artist !== null && <CommissionsCard profile={profile} />}
      {profile.adopts && <AdoptsCard profile={profile} />}
      {profile.links.length > 0 && <LinksCard profile={profile} />}
      <GalleryCard profile={profile} />
    </div>
  );
}

function CardHeading({
  icon,
  title,
  id,
}: {
  icon: React.ReactNode;
  title: string;
  id?: string;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 font-display text-[0.9375rem] font-bold text-ink">
      <span className="grid size-7 place-items-center rounded-[8px] bg-ice text-accent-strong [&_svg]:size-3.5">
        {icon}
      </span>
      {title}
    </h2>
  );
}

/** A new account that hasn't set up any commission service yet. */
const hasNoServices = ({ commissions }: ArtistProfile) =>
  commissions.types.length === 0 && commissions.slotsTotal === 0 && commissions.startingPriceUsd === 0;

const STATUS_DOT = {
  open: { label: "Open", dot: "bg-mint-dot", text: "text-mint-ink" },
  waitlist: { label: "Waitlist", dot: "bg-lilac", text: "text-lilac-ink" },
  closed: { label: "Closed", dot: "bg-muted", text: "text-muted" },
} as const;

function CommissionsCard({ profile }: { profile: ArtistProfile }) {
  const { commissions, handle } = profile;
  const slotsLeft = Math.max(0, commissions.slotsTotal - commissions.slotsTaken);
  const isOpen = commissions.status === "open";
  const status = STATUS_DOT[commissions.status];

  if (hasNoServices(profile)) {
    return (
      <section aria-labelledby="commissions-heading" data-part="card" className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <CardHeading id="commissions-heading" icon={<Brush />} title="Commissions" />
        <p className="mt-2 text-sm text-muted">Not taking commissions yet.</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="commissions-heading"
      data-part="card"
      className="rounded-card border border-border bg-surface p-4 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <CardHeading id="commissions-heading" icon={<Brush />} title="Commissions" />
        <p className="text-sm text-muted">
          starting at{" "}
          <span className="font-display text-base font-extrabold text-ink">
            {formatUsd(commissions.startingPriceUsd)}
          </span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <p className={`inline-flex items-center gap-1.5 font-semibold ${status.text}`}>
          <span aria-hidden className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
          {commissions.slotsTotal > 0 && (
            <span className="font-medium text-muted">
              · {slotsLeft}/{commissions.slotsTotal} slots left
            </span>
          )}
        </p>
        {commissions.turnaround && (
          <p className="inline-flex shrink-0 items-center gap-1 text-muted">
            <Clock aria-hidden className="size-3.5" />
            {commissions.turnaround}
          </p>
        )}
      </div>
      {/* Slot meter: one segment per slot so the state isn't color-only. */}
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: commissions.slotsTotal }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < commissions.slotsTaken ? "bg-border" : "bg-mint"
            }`}
          />
        ))}
      </div>

      {/* One line that truncates instead of wrapping into a ragged chip cloud. */}
      <p
        className="mt-3 truncate text-xs text-muted"
        title={commissions.types.join(" · ")}
      >
        <span className="sr-only">Offers: </span>
        {commissions.types.join(" · ")}
      </p>

      <Link
        href={`/${handle}/commissions`}
        className={buttonClasses({
          variant: isOpen ? "primary" : "secondary",
          size: "sm",
          className: "mt-3 w-full",
        })}
      >
        {isOpen ? "Request a commission" : commissions.status === "waitlist" ? "Join the waitlist" : "See services"}
      </Link>
    </section>
  );
}

/** Ready-made characters for sale: a peek at the hang-tagged ones. */
function AdoptsCard({ profile }: { profile: ArtistProfile }) {
  const { adopts, handle } = profile;
  if (!adopts) return null;
  return (
    <Link
      href={`/${handle}/adoptables`}
      aria-label={`Adoptables, ${adopts.available} available`}
      data-part="card"
      className="group block rounded-card border border-border bg-surface p-4 shadow-soft transition-[border-color,box-shadow] hover:border-sky/60 hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <CardHeading icon={<Tag />} title="Adoptables" />
        <span className="text-xs font-semibold text-muted">
          {adopts.available > 0 ? `${adopts.available} looking for a home` : "All adopted"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {adopts.preview.map((image) => (
          <div key={image.src} className="relative aspect-square overflow-hidden rounded-[10px] bg-ice" style={{ backgroundColor: image.palette?.[0] }}>
            <Image src={image.src} alt="" fill sizes="90px" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          </div>
        ))}
      </div>
    </Link>
  );
}

function GalleryCard({ profile }: { profile: ArtistProfile }) {
  const { gallery, handle } = profile;
  const tiles = gallery.preview.slice(0, 3);
  const hidden = gallery.total - tiles.length;

  return (
    <Link
      href={`/${handle}/gallery`}
      aria-label={`Gallery, ${gallery.total} artworks`}
      data-part="card"
      className="group block rounded-card border border-border bg-surface p-4 shadow-soft transition-[border-color,box-shadow] hover:border-sky/60 hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <CardHeading icon={<LayoutGrid />} title="Gallery" />
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-accent-strong tabular-nums">
          {gallery.total}
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {tiles.map((image, i) => (
          <div
            key={image.src}
            className="relative aspect-square overflow-hidden rounded-[10px] bg-ice"
          >
            <Image
              src={image.src}
              alt=""
              fill
              sizes="90px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            {i === tiles.length - 1 && hidden > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-scrim/50 font-display text-sm font-bold text-white">
                +{hidden + 1}
              </span>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}

function LinksCard({ profile }: { profile: ArtistProfile }) {
  return (
    <section
      aria-labelledby="links-heading"
      data-part="card"
      className="rounded-card border border-border bg-surface p-4 shadow-soft"
    >
      <CardHeading id="links-heading" icon={<Link2 />} title="Links" />
      <ul className="mt-2 -mx-1 grid">
        {profile.links.map((link) => (
          <li key={`${link.platform}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="me noopener noreferrer"
              className="group flex items-center gap-3 rounded-input px-2 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ice"
            >
              <SocialIcon platform={link.platform} className="size-[1.125rem] text-muted transition-colors group-hover:text-accent-strong" />
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <ArrowUpRight
                aria-hidden
                className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100"
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small-screen version: the same shortcuts in two rows so the feed starts sooner. */
export function ProfileShortcutsCompact({ profile }: { profile: ArtistProfile }) {
  const { commissions, gallery, handle } = profile;
  const statusLabel = {
    open: "Open",
    waitlist: "Waitlist",
    closed: "Closed",
  }[commissions.status];

  const tile =
    "flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft transition-colors hover:border-sky/60";

  return (
    <nav aria-label={`${profile.displayName}'s shortcuts`} className="grid gap-3">
      <div className={`grid gap-3 ${profile.artist !== null ? "grid-cols-2" : ""}`}>
        {profile.artist !== null && (
          <Link href={`/${handle}/commissions`} className={tile}>
            <span className="grid size-10 shrink-0 place-items-center rounded-input bg-ice text-accent-strong">
              <Brush aria-hidden className="size-[1.125rem]" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold text-ink">Commissions</span>
              <span className="block text-xs text-muted">
                {hasNoServices(profile) ? "Not open yet" : `${statusLabel} · starting at ${formatUsd(commissions.startingPriceUsd)}`}
              </span>
            </span>
          </Link>
        )}
        <Link href={`/${handle}/gallery`} className={tile}>
          <span className="relative size-10 shrink-0 overflow-hidden rounded-input bg-ice">
            {gallery.preview[0] && (
              <Image src={gallery.preview[0].src} alt="" fill sizes="40px" className="object-cover" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-bold text-ink">Gallery</span>
            <span className="block truncate text-xs text-muted">{gallery.total} artworks</span>
          </span>
        </Link>
      </div>

      {profile.adopts && (
        <Link href={`/${handle}/adoptables`} className={tile}>
          <span className="flex shrink-0 -space-x-3">
            {profile.adopts.preview.slice(0, 3).map((image) => (
              <span key={image.src} className="relative size-10 overflow-hidden rounded-input bg-ice ring-2 ring-surface">
                <Image src={image.src} alt="" fill sizes="40px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-bold text-ink">Adoptables</span>
            <span className="block truncate text-xs text-muted">
              {profile.adopts.available > 0 ? `${profile.adopts.available} looking for a home` : "All adopted"}
            </span>
          </span>
        </Link>
      )}

      {profile.links.length > 0 && (
        <ul
          aria-label="Links"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6"
        >
          {profile.links.map((link) => (
            <li key={`${link.platform}-${link.url}`} className="shrink-0">
              <a
                href={link.url}
                target="_blank"
                rel="me noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-ice"
              >
                <SocialIcon platform={link.platform} className="size-4 text-muted" />
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
