import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { HangTag } from "@/components/explore/adopt-card";
import { HandNote, Tape } from "@/components/explore/doodles";
import { SlotMeter } from "@/components/explore/slot-meter";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import type { FeedEntry, ResolvedEmbed } from "@/lib/profile/queries";
import { categoryLabel } from "@/lib/listings/catalog";

// Ticket stub: the perforation sits 11rem down, with a half-circle bite on each side.
const STUB = "11rem";
const BITE = `radial-gradient(circle at 0 ${STUB}, transparent 11px, black 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% ${STUB}, transparent 11px, black 11.5px) right / 51% 100% no-repeat`;

type ServiceEmbed = Extract<ResolvedEmbed, { type: "service" }>;
type AdoptableEmbed = Extract<ResolvedEmbed, { type: "adoptable" }>;

/** A commission, torn off like a ticket: examples on the stub, the deal below the perforation. */
export function CommissionTicket({ embed }: { embed: ServiceEmbed }) {
  const { service, status, slotsLeft, slotsTotal } = embed;
  const open = status === "open";
  const href = `/${service.ownerHandle}/commissions#${service.id}`;

  return (
    <div className="mx-auto w-full max-w-[22rem] drop-shadow-[0_18px_30px_rgb(var(--shadow-rgb)/0.16)]">
      <article
        className="group relative overflow-hidden rounded-[22px] bg-surface"
        style={{ mask: BITE, WebkitMask: BITE }}
      >
        <div className="relative isolate overflow-hidden bg-ice" style={{ height: STUB }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {service.examples.slice(0, 3).map((image, i) => (
              <span
                key={image.src}
                className="relative -mx-3 block aspect-3/4 w-[34%] overflow-hidden rounded-[10px] border-[3px] border-paper shadow-lift transition-[rotate,translate] duration-500 ease-out group-hover:rotate-0"
                style={{
                  rotate: `${(i - 1) * 8}deg`,
                  translate: `0 ${i === 1 ? -6 : 6}px`,
                  zIndex: i === 1 ? 2 : 1,
                  backgroundColor: image.palette?.[0],
                }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="120px"
                  className="object-cover"
                  style={{ objectPosition: image.focus ?? "50% 25%" }}
                />
              </span>
            ))}
          </div>
        </div>

        <div aria-hidden className="mx-5 border-t-2 border-dashed border-border" />

        <div className="p-5 pt-4">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
            Commission · {categoryLabel(service.category)}
          </p>
          <h3 className="mt-1 font-display text-xl leading-tight font-extrabold text-ink">
            <Link href={href} className="after:absolute after:inset-0">
              {service.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            from <span className="font-display text-2xl font-extrabold text-ink">{formatUsd(service.priceFromUsd)}</span>
            {service.discountPercent && (
              <Stamp tone="like" className="ml-auto rotate-[4deg]">
                −{service.discountPercent}% this month
              </Stamp>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            {open ? (
              <SlotMeter total={slotsTotal} taken={slotsTotal - slotsLeft} />
            ) : (
              <span className="text-sm font-semibold text-ink">{status === "waitlist" ? "Waitlist open" : "Closed for now"}</span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock aria-hidden className="size-3.5" />
              {service.turnaround}
            </span>
          </div>
          <span className={buttonClasses({ size: "md", className: "pointer-events-none mt-4 w-full" })}>
            {open ? "Request a slot" : "See the menu"}
          </span>
        </div>
      </article>
    </div>
  );
}

/** An adoptable character, with its price on a string tag. */
export function AdoptableCard({ embed }: { embed: AdoptableEmbed }) {
  const { artwork } = embed;
  const sold = artwork.adopt?.status === "sold";

  return (
    <article className="group relative mx-auto w-full max-w-[19rem] pt-3">
      <div
        className="relative aspect-4/5 overflow-hidden rounded-[22px] bg-ice shadow-lift"
        style={{ backgroundColor: artwork.image.palette?.[0] }}
      >
        <Image
          src={artwork.image.src}
          alt={artwork.image.alt}
          fill
          sizes="304px"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${sold ? "saturate-50" : ""}`}
          style={{ objectPosition: artwork.image.focus ?? "50% 20%" }}
        />
        {sold && (
          <span className="absolute inset-0 grid place-items-center bg-scrim/25">
            <Stamp tone="like" className="-rotate-12 bg-paper/90 px-3 py-1.5 text-sm">
              Adopted ♥
            </Stamp>
          </span>
        )}
      </div>
      {!sold && artwork.adopt && <HangTag sale={{ type: "flat", priceUsd: artwork.adopt.priceUsd }} />}
      <div className="mt-3 px-1">
        <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Adoptable · ref sheet included</p>
        <h3 className="mt-0.5 font-display text-lg leading-tight font-extrabold text-ink">
          <Link href={`/${artwork.ownerHandle}/gallery`} className="after:absolute after:inset-0 hover:underline">
            {artwork.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}

/** A repost, pinned up as a polaroid with the original artist's name on it. */
export function PinnedReference({ quote }: { quote: NonNullable<FeedEntry["quote"]> }) {
  const { post, author } = quote;
  const cover = post.media[0];
  // Written on the print like a title: the first clause of the original caption.
  const title = post.body.split(/[\n,.!?—]/)[0].replace(/\p{Extended_Pictographic}/gu, "").trim();

  return (
    <Link
      href={`/${author.handle}#${post.id}`}
      className="group relative mx-auto block w-full max-w-[18rem] rotate-[2.5deg] rounded-[4px] bg-paper p-2.5 pb-0 shadow-lift transition-[rotate,scale] duration-500 ease-out hover:scale-[1.02] hover:rotate-0"
    >
      <Tape tone="sky" className="-top-3 left-1/2 w-24 -translate-x-1/2 rotate-[-4deg]" />
      {cover ? (
        <span
          className="relative block overflow-hidden rounded-[2px]"
          style={{ aspectRatio: `${cover.width} / ${cover.height}`, backgroundColor: cover.palette?.[0] }}
        >
          <Image src={cover.src} alt={cover.alt} fill sizes="280px" className="object-cover" />
          {post.media.length > 1 && (
            <span className="absolute right-2 bottom-2 rounded-full bg-paper/95 px-2 py-0.5 text-[0.6875rem] font-bold text-on-paper shadow-soft">
              +{post.media.length - 1}
            </span>
          )}
        </span>
      ) : (
        // A text post: its words, written on the page instead of a picture.
        <span className="dot-paper block rounded-[2px] px-4 py-5 font-display text-[1.0625rem] leading-snug font-bold text-on-paper">
          <span className="line-clamp-6">{post.body}</span>
        </span>
      )}
      <span className="flex items-baseline justify-between gap-2 px-1 pt-2 pb-3">
        <HandNote tone="paper" className="truncate text-xl">
          {cover ? title : `${author.displayName.split(" ")[0]}'s note`}
        </HandNote>
        <span className="shrink-0 text-[0.6875rem] font-semibold text-paper-muted">@{author.handle}</span>
      </span>
    </Link>
  );
}
