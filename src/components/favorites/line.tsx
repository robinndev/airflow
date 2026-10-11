import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { CSSProperties } from "react";
import { HangTag } from "@/components/explore/adopt-card";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import type { FavoriteArt, FavoriteService } from "@/lib/favorites/queries";
import { formatUsd } from "@/lib/format";
import { glowOf } from "@/lib/palette";
import { Pinned } from "./pinned";
import { tiltOf } from "./wall";

/*
 * The line: what you're saving up for (commission services and adoptables),
 * hung on a string across the wall with pegs dyed in each piece's colors.
 * It scrolls sideways when it's full; the string sags under the weight.
 */

export type LineItem = FavoriteService | (FavoriteArt & { adopt: NonNullable<FavoriteArt["adopt"]> });

export function isLineItem(item: FavoriteService | FavoriteArt): item is LineItem {
  return item.kind === "service" || item.adopt !== undefined;
}

/** How far the string has dropped at this point along it (px), for a 16px sag. */
const sagAt = (t: number) => 4 + 64 * t * (1 - t);

export function Line({ items }: { items: LineItem[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-8 [scrollbar-width:none] sm:-mx-6 sm:px-6">
      <div className="relative w-max min-w-full">
        <svg
          aria-hidden
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 w-full overflow-visible text-muted"
        >
          <defs>
            <linearGradient id="peg-shine" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".45" />
              <stop offset=".5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity=".12" />
            </linearGradient>
          </defs>
          <path d="M0 4 Q500 36 1000 4" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity=".7" />
        </svg>
        {/* The nails it's tied to. */}
        <span aria-hidden className="absolute top-0.5 -left-1 size-2.5 rounded-full bg-muted ring-2 ring-canvas" />
        <span aria-hidden className="absolute top-0.5 -right-1 size-2.5 rounded-full bg-muted ring-2 ring-canvas" />

        <ul className="relative flex justify-around gap-7 sm:gap-10">
          {items.map((item, i) => {
            const y = sagAt((i + 0.5) / items.length);
            return (
              <Pinned
                key={item.key}
                entry={{ key: item.key, group: "line", moods: item.moods }}
                target={{ kind: item.kind, id: item.id, title: item.title, savedAt: item.savedAt }}
                unpinClassName="top-[calc(var(--y)+1.75rem)] -right-2.5"
                className="shrink-0"
                style={{ "--y": `${y}px` } as CSSProperties}
              >
                <div
                  className="relative origin-[50%_var(--y)] pt-[calc(var(--y)+1.25rem)] group-hover/pin:animate-swing"
                  style={{ rotate: `${tiltOf(item.id, 2.2)}deg` }}
                >
                  <Peg color={glowOf(item.palette, 1)[0]} />
                  {item.kind === "service" ? <Ticket item={item} /> : <Adoptable item={item} />}
                </div>
              </Pinned>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** A clothes peg, clipped onto the string and the top edge of the card. */
function Peg({ color }: { color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 40"
      className="absolute top-[calc(var(--y)-0.5rem)] left-1/2 z-10 h-10 w-4 -translate-x-1/2 drop-shadow-[0_2px_2px_rgb(var(--shadow-rgb)/0.3)]"
    >
      <rect x="1.5" y="0" width="13" height="40" rx="3.5" fill={color ?? "var(--sky)"} />
      <rect x="1.5" y="0" width="13" height="40" rx="3.5" fill="url(#peg-shine)" />
      <line x1="8" y1="3" x2="8" y2="37" stroke="rgb(0 0 0 / .22)" strokeWidth="1" />
      <circle cx="8" cy="14" r="3.4" fill="none" stroke="var(--paper-muted)" strokeWidth="1.6" />
    </svg>
  );
}

// Ticket stub: the perforation sits 8.5rem down, with a half-circle bite on each side.
const STUB = "8.5rem";
const BITE = `radial-gradient(circle at 0 ${STUB}, transparent 10px, black 10.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% ${STUB}, transparent 10px, black 10.5px) right / 51% 100% no-repeat`;

const CALL: Record<FavoriteService["status"], string> = {
  open: "Request a slot",
  waitlist: "Join the waitlist",
  closed: "See the menu",
};

/** A commission service, torn off like a ticket: examples on the stub, the deal below. */
function Ticket({ item }: { item: FavoriteService }) {
  const { service, artist, status, slotsLeft, slotsTotal } = item;
  return (
    <div className="w-[15.5rem] drop-shadow-[0_16px_24px_rgb(var(--shadow-rgb)/0.2)]">
      <Link
        href={item.href}
        className="group/ticket block overflow-hidden rounded-[18px] bg-paper text-on-paper"
        style={{ mask: BITE, WebkitMask: BITE }}
      >
        <span
          className="relative isolate flex items-center justify-center overflow-hidden"
          style={{ height: STUB, backgroundColor: `color-mix(in oklab, ${service.examples[0]?.palette?.[0] ?? "var(--ice)"} 30%, var(--paper))` }}
        >
          {service.examples.slice(0, 3).map((image, i) => (
            <span
              key={image.src}
              className="relative -mx-2.5 block aspect-3/4 w-[30%] overflow-hidden rounded-[8px] border-[3px] border-paper shadow-lift transition-[rotate,translate] duration-500 ease-out group-hover/ticket:rotate-0"
              style={{
                rotate: `${(i - 1) * 9}deg`,
                translate: `0 ${i === 1 ? -5 : 5}px`,
                zIndex: i === 1 ? 2 : 1,
                backgroundColor: image.palette?.[0],
              }}
            >
              <Image src={image.src} alt="" fill sizes="80px" className="object-cover" style={{ objectPosition: image.focus ?? "50% 25%" }} />
            </span>
          ))}
        </span>

        <span aria-hidden className="mx-4 block border-t-2 border-dashed border-on-paper/15" />

        <span className="block p-4 pt-3">
          <span className="block text-[0.5625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">
            Commission · {service.category}
          </span>
          <span className="mt-1 line-clamp-2 font-display text-[1.0625rem] leading-tight font-extrabold">{service.title}</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-paper-muted">
            <Image
              src={artist.avatar.src}
              alt=""
              width={18}
              height={18}
              className="size-[18px] rounded-full object-cover"
              style={{ objectPosition: artist.avatar.focus }}
            />
            {artist.name}
          </span>
          <span className="mt-2.5 flex items-baseline gap-1.5 text-sm text-paper-muted">
            from <span className="font-display text-2xl font-extrabold text-on-paper">{formatUsd(service.priceFromUsd)}</span>
            {service.discountPercent && (
              <Stamp tone="like" className="ml-auto rotate-[5deg]">
                −{service.discountPercent}%
              </Stamp>
            )}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {status === "open" ? <Slots total={slotsTotal} left={slotsLeft} /> : status === "waitlist" ? (
              <Stamp tone="lilac">Waitlist</Stamp>
            ) : (
              <Stamp tone="paper">Closed</Stamp>
            )}
            <span className="inline-flex items-center gap-1 text-paper-muted">
              <Clock aria-hidden className="size-3.5" />
              {service.turnaround}
            </span>
          </span>
          <span className={buttonClasses({ size: "sm", className: "mt-3.5 w-full" })}>{CALL[status]}</span>
        </span>
      </Link>
    </div>
  );
}

/** Slot lights, printed on paper. */
function Slots({ total, left }: { total: number; left: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-2.5 rounded-full ${i < total - left ? "bg-on-paper/15" : "bg-mint-strong shadow-[0_0_0_2.5px_color-mix(in_oklab,var(--mint)_25%,transparent)]"}`}
          />
        ))}
      </span>
      <span className="font-semibold text-on-paper">{left === 0 ? "Fully booked" : `${left} of ${total} open`}</span>
    </span>
  );
}

/** An adoptable character, with its price on a string tag. */
function Adoptable({ item }: { item: Extract<LineItem, { kind: "art" }> }) {
  const { adopt, image } = item;
  const adopted = adopt.status === "adopted";
  return (
    <div className="relative w-[13.5rem]">
      <Link
        href={item.href}
        className="block bg-paper p-2 pb-3 text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_16px_28px_-14px_rgb(var(--shadow-rgb)/0.45)]"
      >
        <span className="relative block aspect-4/5 overflow-hidden" style={{ backgroundColor: image.palette?.[0] }}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="216px"
            className={`object-cover ${adopted ? "saturate-50" : ""}`}
            style={{ objectPosition: image.focus ?? "50% 20%" }}
          />
          {adopt.status !== "available" && (
            <span className="absolute inset-0 grid place-items-center bg-scrim/20">
              <Stamp tone={adopted ? "like" : "lilac"} className="-rotate-12 bg-paper/90 px-3 py-1.5 text-sm">
                {adopted ? "Adopted ♥" : "Reserved"}
              </Stamp>
            </span>
          )}
        </span>
        <span className="mt-2.5 block px-1">
          <span className="block text-[0.5625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Adoptable</span>
          <span className="block truncate font-display text-[1.0625rem] leading-tight font-extrabold">{item.title}</span>
          <span className="block truncate text-xs text-paper-muted">by {item.artist.name}</span>
        </span>
      </Link>
      {adopt.status === "available" && (
        <HangTag sale={adopt.priceUsd !== undefined ? { type: "flat", priceUsd: adopt.priceUsd } : { type: "offer" }} />
      )}
    </div>
  );
}
