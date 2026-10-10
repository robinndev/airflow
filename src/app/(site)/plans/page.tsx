import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { Suspense } from "react";
import { HandNote, Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { CardAction } from "@/components/plans/card-action";
import { CARD_ART } from "@/components/plans/card-art";
import { FeeTag } from "@/components/plans/fee-tag";
import { HoloTilt } from "@/components/plans/holo-tilt";
import { PlanCard } from "@/components/plans/plan-card";
import { YourCard } from "@/components/plans/your-card";
import { SiteHeader } from "@/components/site/site-header";
import { PLANS, PLAN_ORDER, PLATFORM_FEE_PERCENT, type PlanId } from "@/lib/plans";

// The artist's handwriting, for the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Plans",
  description: "Every artist gets a card. Keep it matte for free, or print it in foil with Flow+ and Flow+ Live.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/** Other pages link here (`/plans#flow-plus`). */
const ANCHORS: Record<PlanId, string> = { free: "free", flow_plus: "flow-plus", live: "live" };

/** How the cards lie on the table on desktop: fanned out, the middle one raised. */
const TURN: Record<PlanId, string> = { free: "lg:-rotate-[4deg]", flow_plus: "", live: "lg:rotate-[4deg]" };
const RAISE: Record<PlanId, string> = { free: "lg:translate-y-8", flow_plus: "lg:-translate-y-1", live: "lg:translate-y-8" };

/** The finish swatches under the headline: the frame of each card, in miniature. */
const SWATCHES: Record<PlanId, string> = {
  free: "grain bg-[color-mix(in_oklab,var(--sky)_16%,var(--paper))] ring-1 ring-on-paper/15",
  flow_plus: "foil",
  live: "foil foil-live",
};

/*
 * Every plan is an artist trading card, printed in a finish: matte (Free),
 * foil (Flow+), live holo (Flow+ Live). The catalog is static; the
 * viewer's own card and each card's action stream in. No checkout yet, so
 * paid plans show the way up without pretending you can pay.
 */
export default function PlansPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        {/* Starts under the header (transparent until scrolled), so the grain and the wash reach the top. */}
        <section
          aria-labelledby="plans-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash
            id="plans-wash"
            className="top-[-30%] left-1/2 h-[150%] w-[min(1100px,140%)] -translate-x-1/2 opacity-90"
          />
          <div className={`${container} relative pt-10 pb-4 text-center sm:pt-16`}>
            <Sparkle className="absolute top-[22%] left-[9%] size-5 animate-twinkle text-sky motion-reduce:animate-none max-sm:hidden" />
            <Sparkle className="absolute top-[12%] right-[13%] size-7 animate-twinkle text-lilac [animation-delay:0.9s] motion-reduce:animate-none" />
            <Sparkle className="absolute right-[7%] bottom-[18%] size-4 animate-twinkle text-mint [animation-delay:1.7s] motion-reduce:animate-none max-sm:hidden" />

            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-bold tracking-[0.18em] text-muted uppercase shadow-soft backdrop-blur-sm">
              <Sparkle className="size-3 text-lilac" />
              Plans
            </p>
            <h1
              id="plans-heading"
              className="mt-6 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem] xl:text-[4.5rem]"
            >
              Pick your{" "}
              <span className="relative inline-block font-hand text-[1.32em] leading-[0.85] font-bold tracking-normal">
                <span className="foil-text pr-1">finish.</span>
                <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-pretty text-muted">
              Every artist on Artiflow gets a card. Keep yours matte and free forever, or print it in foil and make
              your profile entirely yours.
            </p>

            <nav aria-label="Finishes" className="mt-7 flex flex-wrap justify-center gap-2">
              {PLAN_ORDER.map((id) => (
                <a
                  key={id}
                  href={`#${ANCHORS[id]}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1.5 pr-3.5 pl-1.5 text-sm text-ink shadow-soft backdrop-blur-sm transition-colors hover:border-ocean/40 hover:bg-surface"
                >
                  <span aria-hidden className={`size-6 rounded-full ${SWATCHES[id]}`} />
                  <span className="font-semibold">{PLANS[id].finish}</span>
                  <span className="text-muted">{PLANS[id].name}</span>
                </a>
              ))}
            </nav>
          </div>
        </section>

        <Suspense fallback={null}>
          <YourCard className={`${container} mt-10`} />
        </Suspense>

        <section aria-labelledby="finishes-heading" className={`${container} relative mt-16 sm:mt-20`}>
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <h2 id="finishes-heading" className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
              All finishes
            </h2>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          <div className="absolute top-8 right-[6%] hidden rotate-[6deg] lg:block">
            <HandNote>tilt one ✦</HandNote>
          </div>

          <ol className="mt-16 grid justify-items-center gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
            {PLAN_ORDER.map((id, i) => {
              const plan = PLANS[id];
              const art = CARD_ART[id];
              return (
                <li
                  key={id}
                  id={ANCHORS[id]}
                  className={`group/slot relative flex w-full max-w-76 scroll-mt-28 flex-col transition-transform duration-500 ease-out hover:z-10 sm:last:col-span-2 lg:last:col-span-1 lg:hover:translate-y-0 ${RAISE[id]}`}
                >
                  {id === "live" && (
                    <>
                      <Sparkle className="absolute -top-6 -right-4 size-6 animate-twinkle text-lilac motion-reduce:animate-none" />
                      <Sparkle className="absolute top-1/3 -right-7 size-3.5 animate-twinkle text-sky [animation-delay:1.1s] motion-reduce:animate-none" />
                      <Sparkle className="absolute top-[12%] -left-5 size-4 animate-twinkle text-mint [animation-delay:2s] motion-reduce:animate-none" />
                    </>
                  )}
                  <div className={`flex flex-1 transition-[rotate] duration-500 ease-out lg:group-hover/slot:rotate-0 ${TURN[id]}`}>
                    <HoloTilt className="relative flex-1">
                      <PlanCard
                        plan={plan}
                        art={art.image}
                        artFocus={art.focus}
                        footer={[art.credit, `${String(i + 1).padStart(3, "0")}/${String(PLAN_ORDER.length).padStart(3, "0")}`]}
                        id={`plan-${id}`}
                      />
                      {id === "flow_plus" && (
                        <Stamp tone="lilac" className="absolute -top-3 left-1/2 -translate-x-1/2 rotate-[-3deg] bg-paper">
                          <Sparkle className="size-2.5" />
                          Our pick
                        </Stamp>
                      )}
                    </HoloTilt>
                  </div>
                  <div className="mt-6">
                    <Suspense fallback={<div className="h-11" />}>
                      <CardAction plan={plan} />
                    </Suspense>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="fee-heading" className={`${container} mt-28`}>
          <div className="grain relative grid items-center gap-x-12 gap-y-8 overflow-hidden rounded-panel border border-border bg-ice px-6 pt-6 pb-10 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-12 sm:py-10">
            <FeeTag className="mx-auto sm:mx-0" />
            <div className="text-center sm:text-left">
              <h2
                id="fee-heading"
                className="font-display text-[1.75rem] leading-[1.08] font-extrabold tracking-tight text-balance text-ink sm:text-[2.25rem]"
              >
                The finish changes the look, never your cut.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-pretty text-muted">
                Every plan pays the same {PLATFORM_FEE_PERCENT}% on sales, and no plan changes that. Prices in USD,
                billed monthly. Checkout opens soon.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
