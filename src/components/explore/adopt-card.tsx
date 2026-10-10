import Image from "next/image";
import Link from "next/link";
import type { Adopt, AdoptSale, Drop } from "@/lib/explore";
import { formatUsd } from "@/lib/format";
import { Countdown, DropClock, RemindButton } from "./countdown";
import { HandNote } from "./doodles";
import { Stamp } from "./stamp";

const HOLE = "radial-gradient(circle at 50% 13px, transparent 4px, black 4.5px)";

/** Paper price tag hanging from the card on a string; swings on hover. */
function HangTag({ sale }: { sale: AdoptSale }) {
  const tag =
    sale.type === "flat"
      ? { kicker: "Flatsale", value: formatUsd(sale.priceUsd), extra: null }
      : sale.type === "auction"
        ? {
            kicker: "Top bid",
            value: formatUsd(sale.bidUsd),
            extra: (
              <>
                ends <Countdown to={sale.endsAt} fallback="today" done="soon" />
              </>
            ),
          }
        : { kicker: "Offer to", value: "Adopt", extra: "name your price" };

  return (
    <span className="pointer-events-none absolute -top-4 right-2.5 z-10 flex origin-top scale-[0.82] flex-col items-center sm:right-5 sm:scale-100">
      <span aria-hidden className="size-2.5 rounded-full bg-muted shadow-soft ring-2 ring-surface" />
      <span className="flex origin-top flex-col items-center drop-shadow-[0_6px_8px_rgb(var(--shadow-rgb)/0.2)] group-hover:animate-swing">
        <svg aria-hidden viewBox="0 0 12 22" className="-my-px h-5 w-3 text-muted">
          <path d="M6 0c-3 7 3 12 0 22" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span
          className="flex w-[5.25rem] -rotate-[4deg] flex-col items-center bg-paper px-1.5 pt-6 pb-2.5 text-center text-on-paper [clip-path:polygon(24%_0,76%_0,100%_17%,100%_100%,0_100%,0_17%)]"
          style={{ maskImage: HOLE, WebkitMaskImage: HOLE }}
        >
          <span className="text-[0.5625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">{tag.kicker}</span>
          <span className="font-display text-[1.1875rem] leading-tight font-extrabold">{tag.value}</span>
          {tag.extra && <span className="mt-0.5 text-[0.625rem] leading-tight text-paper-muted">{tag.extra}</span>}
        </span>
      </span>
    </span>
  );
}

/** The character's colors, like the swatch row on a ref sheet. */
export function PaletteDots({ colors = [], className = "" }: { colors?: string[]; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 ${className}`}>
      {colors.slice(0, 5).map((color, i) => (
        <span
          key={color}
          className="-ml-1.5 size-4 rounded-full ring-2 ring-canvas first:ml-0"
          style={{ backgroundColor: color, zIndex: 5 - i }}
        />
      ))}
    </span>
  );
}

export function AdoptCard({ adopt }: { adopt: Adopt }) {
  const adopted = adopt.status === "adopted";

  return (
    <article className="group relative">
      <div
        className="relative aspect-4/5 overflow-hidden rounded-[20px] bg-ice"
        style={{ backgroundColor: adopt.image.palette?.[0] }}
      >
        <Image
          src={adopt.image.src}
          alt={adopt.image.alt}
          fill
          sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 48vw"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${adopted ? "saturate-50" : ""}`}
          style={{ objectPosition: adopt.image.focus ?? "50% 20%" }}
        />
        {adopted && (
          <span className="absolute inset-0 grid place-items-center bg-scrim/25">
            <Stamp tone="like" className="-rotate-12 bg-paper/90 px-3 py-1.5 text-sm">
              Adopted ♥
            </Stamp>
          </span>
        )}
        {adopt.status === "reserved" && (
          <span className="absolute bottom-3 left-3 rounded-full bg-paper/95 px-2.5 py-1 text-xs font-bold text-on-paper shadow-soft">
            On hold
          </span>
        )}
      </div>
      {!adopted && <HangTag sale={adopt.sale} />}

      <div className="mt-3 px-0.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-lg leading-tight font-extrabold text-ink">
            <Link href={adopt.href} className="after:absolute after:inset-0 hover:underline">
              {adopt.name}
            </Link>
          </h3>
          <PaletteDots colors={adopt.image.palette} />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {adopt.species} · by {adopt.artist.name}
        </p>
      </div>
    </article>
  );
}

/** Upcoming batch: three face-down "mystery" cards, a big clock and a reminder. */
export function DropCard({ drop, className = "" }: { drop: Drop; className?: string }) {
  const [first] = drop.previews;
  return (
    <article
      className={`relative isolate flex min-h-[27rem] flex-col overflow-hidden rounded-[24px] bg-scrim p-6 text-white ${className}`}
    >
      {first && (
        <Image
          src={first.src}
          alt=""
          fill
          sizes="160px"
          className="-z-20 scale-150 object-cover opacity-45 blur-3xl saturate-150"
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-scrim/30 via-scrim/60 to-scrim" />

      <HandNote tone="glow" className="-rotate-3 text-[1.625rem]">
        next drop ✶
      </HandNote>
      <h3 className="mt-2 font-display text-[1.875rem] leading-[1.05] font-extrabold tracking-tight">{drop.title}</h3>
      <p className="mt-2 text-sm text-white/75">
        {drop.count} chibi adopts by @{drop.artist.handle}. First come, first served.
      </p>

      <div aria-hidden className="relative mx-auto my-auto flex h-40 w-full max-w-[16rem] items-end justify-center py-6 lg:h-56">
        {drop.previews.slice(0, 3).map((image, i) => (
          <span
            key={image.src}
            className="absolute bottom-2 aspect-3/4 w-[40%] rounded-[14px] bg-paper p-1 shadow-lift"
            style={{
              rotate: `${(i - 1) * 13}deg`,
              translate: `${(i - 1) * 62}% ${i === 1 ? -10 : 0}px`,
              zIndex: i === 1 ? 2 : 1,
            }}
          >
            <span className="relative block size-full overflow-hidden rounded-[10px]">
              <Image src={image.src} alt="" fill sizes="110px" className="scale-125 object-cover blur-md saturate-150" />
              <span className="absolute inset-0 grid place-items-center font-hand text-5xl font-bold text-white [text-shadow:0_2px_10px_rgb(0_0_0/0.35)]">
                ?
              </span>
            </span>
          </span>
        ))}
      </div>

      <div>
        <DropClock to={drop.at} className="justify-center" />
        <RemindButton
          label="Remind me"
          doneLabel="Reminder set"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-button bg-paper text-sm font-semibold text-on-paper transition hover:brightness-95 aria-pressed:bg-mint aria-pressed:text-on-mint [&_svg]:size-4"
        />
        <Link
          href={drop.href}
          className="mt-3 block text-center text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          See the last batch
        </Link>
      </div>
    </article>
  );
}
