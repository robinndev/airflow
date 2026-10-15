"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Star } from "lucide-react";
import { Stamp } from "@/components/explore/stamp";
import { FramedAvatar } from "@/components/frames/avatar-frame";
import { SocialIcon } from "@/components/icons/social-icon";
import { LocalTime } from "@/components/settings/local-time";
import { formatMonthYear, formatUsd } from "@/lib/format";
import type { StudioCard as Card } from "@/lib/messages/types";

const STATUS = {
  open: { label: "Comms open", tone: "mint" },
  waitlist: { label: "Waitlist", tone: "lilac" },
  closed: { label: "Closed", tone: "muted" },
} as const;

/**
 * Beside the conversation: the other person's studio card, printed on paper
 * (light in both themes). Who they are, whether they're taking commissions
 * and for how much, where else to find them. Links minimize the chat
 * (`onNavigate`) so the page underneath can be read.
 */
export function StudioCard({ card, onNavigate }: { card: Card; onNavigate: () => void }) {
  const { studio } = card;
  const status = STATUS[studio.status];
  const takingWork = studio.status !== "closed";
  const slotsOpen = Math.max(0, studio.slotsTotal - studio.slotsTaken);
  const first = card.displayName.split(" ")[0];

  return (
    <div className="grain overflow-hidden rounded-card bg-paper text-on-paper shadow-soft ring-1 ring-black/5">
      <div className="relative h-24 bg-ice">
        <Image src={card.banner.src} alt="" fill sizes="336px" className="object-cover" />
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-9 flex items-end justify-between gap-2">
          <FramedAvatar frame={card.frame}>
            <Image
              src={card.avatar.src}
              alt=""
              width={144}
              height={144}
              className="size-[4.5rem] rounded-full bg-ice object-cover ring-4 ring-paper"
              style={card.avatar.focus ? { objectPosition: card.avatar.focus } : undefined}
            />
          </FramedAvatar>
          {card.plan === "pro" && (
            <span className="mb-1 rounded-full bg-lilac/15 px-2 py-0.5 text-[0.6875rem] font-bold text-lilac-ink dark:text-lilac">
              Flow+
            </span>
          )}
        </div>
        <p className="mt-2 font-display text-lg leading-tight font-extrabold">{card.displayName}</p>
        <p className="text-sm text-paper-muted">
          @{card.handle}
          {card.pronouns && ` · ${card.pronouns}`}
        </p>
        {card.headline && <p className="mt-2 text-sm leading-snug">{card.headline}</p>}
        {card.rating && (
          <p className="mt-2 flex items-center gap-1 text-sm">
            <Star aria-hidden className="size-4 fill-star text-star" />
            <span className="font-bold">{card.rating.average.toFixed(1)}</span>
            <span className="text-paper-muted">
              ({card.rating.count} {card.rating.count === 1 ? "review" : "reviews"})
            </span>
          </p>
        )}
      </div>

      <section aria-label="Commissions" className="border-t border-dashed border-black/10 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Commissions</h3>
          <Stamp tone={status.tone} onPaper className="-rotate-3">
            {status.label}
          </Stamp>
        </div>

        {takingWork && studio.slotsTotal > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            <span aria-hidden className="flex flex-wrap gap-1.5">
              {Array.from({ length: studio.slotsTotal }, (_, i) => (
                <span
                  key={i}
                  className={`size-3 rounded-full ${
                    i < studio.slotsTaken
                      ? "bg-black/12"
                      : "bg-mint-strong shadow-[0_0_0_3px_color-mix(in_oklab,var(--mint)_22%,transparent)]"
                  }`}
                />
              ))}
            </span>
            <span className="text-sm font-semibold">
              {slotsOpen === 0 ? "Fully booked" : `${slotsOpen} of ${studio.slotsTotal} slots open`}
            </span>
          </div>
        )}

        {card.services.length > 0 ? (
          <ul className="mt-3 grid gap-1.5">
            {card.services.slice(0, 5).map((service) => (
              <li key={service.id} className="flex items-baseline gap-2 text-sm">
                <Link
                  href={`/${card.handle}/commissions`}
                  onClick={onNavigate}
                  className="min-w-0 truncate hover:underline"
                >
                  {service.title}
                </Link>
                <span aria-hidden className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-black/25" />
                <span className="shrink-0 font-semibold">
                  <span className="text-xs font-normal text-paper-muted">from </span>
                  {formatUsd(service.priceFromUsd)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-paper-muted">
            {takingWork ? `Ask ${first} what they're taking on.` : `${first} isn't taking commissions right now.`}
          </p>
        )}
        {takingWork && studio.turnaround && (
          <p className="mt-2 text-xs text-paper-muted">Usually delivers in {studio.turnaround}.</p>
        )}

        {card.services.length > 0 && (
          <Link
            href={`/${card.handle}/commissions`}
            onClick={onNavigate}
            className={`mt-3 flex h-10 items-center justify-center gap-2 rounded-button text-sm font-semibold transition-[filter,background-color] ${
              takingWork
                ? "bg-ocean text-white hover:brightness-95"
                : "border border-black/10 text-on-paper hover:bg-black/5"
            }`}
          >
            {takingWork ? "Request a commission" : "See their commissions"}
          </Link>
        )}
      </section>

      <section aria-label={`About ${first}`} className="border-t border-dashed border-black/10 px-4 py-4">
        {card.links.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-1.5">
            {card.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-black/10 px-2.5 text-xs font-semibold transition-colors hover:bg-black/5"
                >
                  <SocialIcon platform={link.platform} className="size-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <ul className="grid gap-1.5 text-xs text-paper-muted">
          {card.location && (
            <li className="flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5" />
              {card.location}
            </li>
          )}
          {card.timeZone && (
            <li>
              <LocalTime zone={card.timeZone} name={card.displayName} iconClassName="size-3.5" />
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5" />
            Joined {formatMonthYear(card.joinedAt)}
          </li>
        </ul>
        <Link
          href={`/${card.handle}`}
          onClick={onNavigate}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ocean-ink hover:underline dark:text-ocean"
        >
          View profile
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </section>
    </div>
  );
}
