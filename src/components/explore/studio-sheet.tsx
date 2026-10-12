import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import type { Studio } from "@/lib/explore";
import { formatUsd } from "@/lib/format";
import { Countdown, RemindButton } from "./countdown";
import { SlotMeter } from "./slot-meter";
import { Stamp } from "./stamp";

function StatusStamp({ studio }: { studio: Studio }) {
  const left = studio.slots.total - studio.slots.taken;
  if (studio.status === "soon" && studio.opensAt) {
    return (
      <Stamp tone="lilac" className="rotate-[3deg] bg-surface">
        Opens in <Countdown to={studio.opensAt} />
      </Stamp>
    );
  }
  if (studio.status === "closing") {
    return (
      <Stamp tone="like" className="rotate-[4deg] bg-surface">
        {left === 1 ? "Last slot!" : `${left} slots left`}
      </Stamp>
    );
  }
  return (
    <Stamp tone="mint" className="rotate-[3deg] bg-surface">
      Comms open
    </Stamp>
  );
}

/**
 * A commission sheet, the way artists post them: three tiers with an example
 * and a price each, then slots and turnaround — price, availability and
 * timing visible before anyone clicks (blueprint: commercial trust).
 */
export function StudioSheet({ studio }: { studio: Studio }) {
  const { artist } = studio;
  const upcoming = studio.status === "soon";

  return (
    <article className="group/sheet relative flex h-full flex-col rounded-[24px] border border-border bg-surface p-4 pt-5 shadow-soft transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-5 sm:pt-6">
      <header className="flex items-start gap-3">
        <span className="group/avatar relative shrink-0">
          <Image
            src={artist.avatar.src}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full bg-ice object-cover ring-2 ring-surface"
            style={{ objectPosition: artist.avatar.focus }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 font-display text-[1.0625rem] leading-tight font-bold text-ink">
            <Link href={studio.href} className="truncate after:absolute after:inset-0 after:rounded-[24px] hover:underline">
              {artist.name}
            </Link>
            {artist.verified && <BadgeCheck aria-label="Verified" className="size-4 shrink-0 fill-ocean text-surface" />}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
            <span className="truncate">{studio.specialty}</span>
            <span aria-hidden>·</span>
            {studio.rating.count > 0 ? (
              <>
                <Star aria-hidden className="size-3.5 shrink-0 fill-star text-star" />
                <span className="font-semibold text-ink">{studio.rating.average.toFixed(1)}</span>
                <span className="sr-only">stars from</span>
                <span>({studio.rating.count})</span>
              </>
            ) : (
              <span className="shrink-0 font-semibold text-mint-ink">New</span>
            )}
          </p>
        </div>
      </header>
      {/* Stamped across the card's top edge, like ink on a paper sheet. */}
      <div className="pointer-events-none absolute -top-3 right-5">
        <StatusStamp studio={studio} />
      </div>

      <ol className={`mt-4 grid gap-2 sm:gap-2.5 ${["grid-cols-1", "grid-cols-2", "grid-cols-3"][Math.min(3, studio.tiers.length) - 1]}`}>
        {studio.tiers.map((tier, i) => (
          <li key={`${tier.label}-${i}`} className="min-w-0">
            <div
              className={`relative overflow-hidden rounded-[14px] bg-ice ${studio.tiers.length === 1 ? "aspect-16/10" : "aspect-4/5"}`}
              style={{ backgroundColor: tier.image.palette?.[0] }}
            >
              <Image
                src={tier.image.src}
                alt={tier.image.alt}
                fill
                sizes="(min-width: 1024px) 176px, (min-width: 640px) 28vw, 26vw"
                className="object-cover transition-transform duration-700 ease-out group-hover/sheet:scale-[1.05]"
                style={{ objectPosition: tier.image.focus ?? "50% 25%" }}
              />
              <span
                aria-hidden
                className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-paper/90 font-display text-[0.6875rem] font-extrabold text-on-paper shadow-soft"
              >
                {i + 1}
              </span>
            </div>
            <p className="mt-2 truncate text-[0.8125rem] font-medium text-muted">{tier.label}</p>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-display text-lg leading-tight font-extrabold text-ink">{formatUsd(tier.priceUsd)}</span>
              {tier.originalUsd && (
                <s className="text-xs text-muted">
                  <span className="sr-only">was </span>
                  {formatUsd(tier.originalUsd)}
                </s>
              )}
            </p>
          </li>
        ))}
      </ol>

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-dashed border-border pt-4">
        <SlotMeter total={studio.slots.total} taken={studio.slots.taken} upcoming={upcoming} />
        <span className="text-sm text-muted">· {studio.turnaround}</span>
        <div className="relative z-10 ml-auto">
          {upcoming ? (
            <RemindButton
              label="Notify me"
              doneLabel="We'll ping you"
              className={buttonClasses({ variant: "secondary", size: "sm", className: "aria-pressed:border-lilac/60 aria-pressed:text-lilac-ink" })}
            />
          ) : (
            <Link href={studio.href} className={buttonClasses({ size: "sm" })}>
              Request a slot
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
