import Link from "next/link";
import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ListingArt } from "@/components/listings/listing-art";
import { SlotMeter } from "@/components/explore/slot-meter";
import { Stamp } from "@/components/explore/stamp";
import { categoryLabel, styleLabel } from "@/lib/listings/catalog";
import { slotsLeft, type Slots } from "@/lib/listings/slots";
import { formatUsdExact } from "@/lib/format";
import type { CommissionService, CommissionStatus, ImageAsset } from "@/lib/profile/types";

export function StatusStamp({ status, slots, className = "" }: { status: CommissionStatus | "soon"; slots: Slots; className?: string }) {
  const left = slotsLeft(slots);
  if (status === "soon") return <Stamp tone="lilac" onPaper className={className}>Opens soon</Stamp>;
  if (status === "closed") return <Stamp tone="muted" onPaper className={className}>Closed</Stamp>;
  if (status === "waitlist") return <Stamp tone="lilac" onPaper className={className}>Waitlist</Stamp>;
  if (left !== null && left <= 2) {
    return (
      <Stamp tone="like" onPaper className={className}>
        {left === 1 ? "Last slot!" : `${left} slots left`}
      </Stamp>
    );
  }
  return <Stamp tone="mint" onPaper className={className}>Open</Stamp>;
}

/** Each package as a line of a price list, with dotted leaders to its price. */
export function PriceLadder({ service, className = "" }: { service: Pick<CommissionService, "packages" | "priceFromUsd" | "title">; className?: string }) {
  const lines = service.packages?.length ? service.packages : [{ id: "from", label: "From", priceUsd: service.priceFromUsd, includes: [] }];
  return (
    <dl aria-label="Prices" className={`grid gap-1 ${className}`}>
      {lines.map((p) => (
        <div key={p.id} className="flex items-baseline gap-2 text-sm">
          <dt className="shrink-0 text-ink/85">{p.label}</dt>
          <span aria-hidden className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-border" />
          <dd className="shrink-0 font-display text-base font-extrabold text-ink tabular-nums">{formatUsdExact(p.priceUsd)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * One commission service as a price sheet: its examples pinned on top, the
 * packages as a price list, then slots, turnaround and the way in. Used by
 * search, the studio (with the owner's controls in `footer`) and the editor's
 * live preview. Status, slots and the price are readable before any click.
 */
export function ServiceSheet({
  service,
  status,
  slots,
  href,
  artist,
  action,
  footer,
  imageSizes = "(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw",
  priority = false,
}: {
  service: CommissionService;
  /** "soon": closed now, opening on a date (the generated demo studios). */
  status: CommissionStatus | "soon";
  slots: Slots;
  href?: string;
  artist?: { handle: string; name: string; avatar: ImageAsset };
  /** The buyer's way in (Request, Join waitlist, Notify me), bottom right. */
  action?: ReactNode;
  /** Replaces the bottom row (the studio's controls). */
  footer?: ReactNode;
  imageSizes?: string;
  priority?: boolean;
}) {
  const [cover, ...rest] = service.examples;
  const side = rest.slice(0, 2);
  const closed = status === "closed" || status === "soon";

  return (
    <article
      data-part="service-sheet"
      className={`group/sheet relative flex h-full flex-col rounded-[24px] border border-border bg-surface p-3 shadow-soft transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-lift ${closed ? "[&_[data-art]]:saturate-[0.35]" : ""}`}
    >
      <div className={`grid gap-1.5 ${side.length ? "grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
        {/* Art is shown whole on the box's own color, so transparent PNGs and GIFs sit on the sheet. */}
        <div data-art className="relative aspect-4/3 overflow-hidden rounded-[16px] bg-ice">
          {cover && (
            <ListingArt
              image={cover}
              priority={priority}
              sizes={imageSizes}
              className="transition-transform duration-700 ease-out group-hover/sheet:scale-[1.04]"
            />
          )}
        </div>
        {side.length > 0 && (
          <div className="grid gap-1.5">
            {side.map((image, i) => (
              <div
                key={`${image.src}-${i}`}
                data-art
                className={`relative overflow-hidden rounded-[12px] bg-ice ${side.length === 1 ? "h-full" : ""}`}
              >
                <ListingArt image={image} alt="" sizes="140px" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute -top-3 right-5 z-10">
        <StatusStamp status={status} slots={slots} className="rotate-[3deg] bg-paper" />
      </div>

      <div className="flex flex-1 flex-col px-2 pt-3.5 pb-1">
        <p className="truncate text-[0.6875rem] font-bold tracking-[0.12em] text-muted uppercase">
          {categoryLabel(service.category)}
          {service.styles?.length ? ` · ${service.styles.slice(0, 2).map(styleLabel).join(", ")}` : ""}
        </p>
        <h3 className="mt-1 font-display text-lg leading-snug font-extrabold text-ink">
          {href ? (
            <Link href={href} className="after:absolute after:inset-0 after:rounded-[24px] hover:underline">
              {service.title || "Untitled service"}
            </Link>
          ) : (
            service.title || "Untitled service"
          )}
        </h3>
        {artist && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Avatar image={{ ...artist.avatar, alt: "" }} size={20} className="size-5" />
            <span className="truncate">by {artist.name}</span>
          </p>
        )}

        <PriceLadder service={service} className="mt-3" />

        <div className="mt-auto pt-4">
        {footer ?? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-border pt-3">
            {slots && !closed ? (
              <SlotMeter total={slots.total} taken={slots.taken} className="[&>span:last-child]:text-xs" />
            ) : (
              <span className="text-xs font-semibold text-muted">
                {status === "soon" ? "Opening soon" : closed ? "Not taking requests" : status === "waitlist" ? "No start date yet" : "No slot limit"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock aria-hidden className="size-3.5" />
              {service.turnaround}
            </span>
            {action && <div className="relative z-10 ml-auto">{action}</div>}
          </div>
        )}
        </div>
      </div>
    </article>
  );
}
