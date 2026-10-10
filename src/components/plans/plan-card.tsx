import Image from "next/image";
import { Heart, Play } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Sparkle } from "@/components/explore/doodles";
import { formatPlanPrice, type Plan, type PlanId } from "@/lib/plans";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * A plan as an artist trading card: name and cost, an art window, the finish
 * with its rarity in sparkles, perks as the card's abilities, a line of
 * flavor text and the illustrator's credit. The face is paper (light in both
 * themes); the finish lives on the frame, so foil never covers the art.
 */

const FRAMES: Record<PlanId, string> = {
  // Matte: tinted card stock with paper grain.
  free: "grain bg-[color-mix(in_oklab,var(--sky)_16%,var(--paper))] ring-1 ring-on-paper/10",
  flow_plus: "foil",
  live: "foil foil-live",
};

const RARITY: Record<PlanId, number> = { free: 1, flow_plus: 2, live: 3 };

const REACTIONS = [
  { delay: "0s", drift: "-12px" },
  { delay: "1.1s", drift: "6px" },
  { delay: "2.1s", drift: "-4px" },
];

export type PlanCardProps = {
  plan: Plan;
  /** Defaults to the plan's name; an artist's own card carries their name. */
  title?: string;
  art: ImageAsset;
  artFocus?: string;
  /** The artist's picture, set into the corner of the art. */
  portrait?: ImageAsset;
  flavor?: string;
  /** Bottom line: illustrator and set number, or handle and day. */
  footer: [ReactNode, ReactNode];
  /** The catalog shows the price; an artist's own card shows the plan's name. */
  badge?: "price" | "plan";
  as?: "h2" | "h3" | "p";
  id?: string;
};

export function PlanCard({
  plan,
  title = plan.name,
  art,
  artFocus,
  portrait,
  flavor = plan.tagline,
  footer,
  badge = "price",
  as: Title = "h3",
  id,
}: PlanCardProps) {
  return (
    <article
      aria-labelledby={id}
      className={`relative flex h-full flex-col rounded-[20px] p-3 shadow-lift ${FRAMES[plan.id]}`}
    >
      <div className="flex flex-1 flex-col rounded-[13px] bg-paper text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.12)]">
        <header className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-2">
          <Title id={id} className="truncate font-display text-[1.3125rem] leading-tight font-extrabold tracking-tight">
            {title}
          </Title>
          {badge === "price" ? (
            <p className="flex shrink-0 items-baseline gap-0.5 rounded-full bg-on-paper px-2.5 py-1 text-paper">
              <span className="font-display text-[0.9375rem] leading-none font-extrabold tabular-nums">
                {formatPlanPrice(plan)}
              </span>
              <span className="text-[0.625rem] leading-none font-semibold opacity-75">
                {plan.priceUsd === 0 ? " forever" : "/mo"}
              </span>
            </p>
          ) : (
            <p className="shrink-0 rounded-full bg-on-paper px-2.5 py-1 font-display text-[0.75rem] leading-none font-extrabold text-paper">
              {plan.name}
            </p>
          )}
        </header>

        <div
          className="relative mx-2 aspect-[4/3] overflow-hidden rounded-[10px] bg-ice"
          style={{ backgroundColor: art.palette?.[0] }}
        >
          <Image
            src={art.src}
            alt={art.alt}
            fill
            sizes="(min-width: 640px) 300px, 80vw"
            className={`object-cover ${plan.id === "flow_plus" ? "animate-breathe motion-reduce:animate-none" : ""}`}
            style={{ objectPosition: artFocus ?? art.focus }}
          />
          {/* The window's bevel. */}
          <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_4px_rgb(0_0_0/0.3)]" />

          {plan.id === "flow_plus" && (
            <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-[0.625rem] font-extrabold tracking-[0.12em] text-on-paper shadow-soft backdrop-blur-sm">
              <Play aria-hidden className="size-2.5 fill-current" />
              GIF
            </span>
          )}

          {plan.id === "live" && (
            <>
              <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[6px] bg-like px-1.5 py-[3px] text-[0.625rem] leading-none font-extrabold tracking-[0.14em] text-white shadow-soft">
                <span aria-hidden className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-80 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                </span>
                LIVE
              </span>
              <span aria-hidden className="absolute right-3 bottom-2 h-20 w-6 motion-reduce:hidden">
                {REACTIONS.map(({ delay, drift }) => (
                  <Heart
                    key={delay}
                    className="absolute bottom-0 left-1 size-4 animate-float-up fill-like text-white/90 drop-shadow"
                    style={{ animationDelay: delay, "--drift": drift } as CSSProperties}
                  />
                ))}
              </span>
            </>
          )}

          {portrait && (
            <Image
              src={portrait.src}
              alt=""
              width={56}
              height={56}
              className="absolute bottom-2 left-2 size-14 rounded-full bg-ice object-cover shadow-lift ring-[3px] ring-paper"
              style={{ objectPosition: portrait.focus }}
            />
          )}
        </div>

        <p className="mx-3 mt-2.5 flex items-center justify-between border-b border-on-paper/10 pb-1.5 text-[0.625rem] font-extrabold tracking-[0.16em] text-paper-muted uppercase">
          <span>{plan.finish} finish</span>
          <span className="flex gap-0.5 text-ocean">
            <span className="sr-only">Rarity {RARITY[plan.id]} of 3</span>
            {Array.from({ length: RARITY[plan.id] }, (_, i) => (
              <Sparkle key={i} className="size-2.5" />
            ))}
          </span>
        </p>

        <ul className="mx-3 mt-2.5 grid gap-1.5 text-[0.8125rem] leading-snug">
          {plan.perks.map((perk) => (
            <li key={perk} className="flex gap-2">
              <span aria-hidden className="mt-[0.4em] size-1.5 shrink-0 rotate-45 rounded-[1px] bg-ocean" />
              {perk}
            </li>
          ))}
        </ul>

        <p className="mx-3 mt-auto line-clamp-2 pt-3 text-[0.8125rem] leading-snug text-paper-muted italic">
          “{flavor}”
        </p>

        <footer className="mt-2 flex items-center justify-between gap-3 border-t border-on-paper/10 px-3 py-1.5 text-[0.625rem] font-semibold tracking-wide text-paper-muted">
          <span className="truncate">{footer[0]}</span>
          <span className="shrink-0 tabular-nums">{footer[1]}</span>
        </footer>
      </div>

      <span aria-hidden className="card-glare absolute inset-0" />
    </article>
  );
}
