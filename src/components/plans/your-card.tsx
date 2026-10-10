import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { HandNote, Sparkle, Tape, Wash } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { formatDay, formatDayShort } from "@/lib/format";
import { getViewerPlan } from "@/lib/plan-status";
import {
  PLANS,
  formatPlanAge,
  formatPlanPrice,
  formatPlanStep,
  planDay,
  upgradesFrom,
  type Plan,
  type PlanId,
} from "@/lib/plans";
import { getProfile } from "@/lib/profile/queries";
import { HoloTilt } from "./holo-tilt";
import { PlanCard } from "./plan-card";
import { PlanSeal } from "./plan-seal";

const ASIDES: Record<PlanId, string> = {
  free: "matte is a look too ✎",
  flow_plus: "look at it shine ✦",
  live: "on air ✦",
};

/** What a plan adds on top of the one below it. */
const adds = (plan: Plan) => plan.perks.filter((perk) => !perk.startsWith("Everything in"));

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * The signed-in artist's own card: their cover and picture printed in their
 * plan's finish, the days they've had it, and the next finish up. The switch
 * runs the next finish over their card like a laminator (CSS only, through
 * `group-has-checked`). Renders nothing for visitors.
 */
export async function YourCard({ className = "" }: { className?: string }) {
  const viewer = await getViewerPlan();
  const profile = viewer && (await getProfile(viewer.handle));
  if (!viewer || !profile) return null;

  const plan = PLANS[viewer.plan];
  const [next, beyond] = upgradesFrom(plan.id);
  const day = planDay(viewer.since, viewer.now);
  const age = formatPlanAge(viewer.since, viewer.now);
  const own = {
    title: profile.displayName,
    art: profile.banner,
    artFocus: `50% ${profile.appearance.bannerFocusY}%`,
    portrait: profile.avatar,
    flavor: profile.bio.trim() || undefined,
    badge: "plan" as const,
    as: "p" as const,
    eager: true,
  };

  return (
    <section aria-labelledby="your-plan-heading" className={className}>
      <div className="group/yours grain relative overflow-hidden rounded-panel border border-border bg-surface px-5 pt-14 pb-10 shadow-soft sm:px-10 lg:px-14 lg:py-14">
        <Wash id="your-plan-wash" className="top-[-25%] left-[-20%] h-[150%] w-[75%] max-lg:h-[70%] max-lg:w-[150%]" />

        <div className="relative grid items-center gap-x-16 gap-y-14 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="relative mx-auto w-full max-w-76">
            <HandNote className="absolute -top-10 right-1 rotate-[5deg] transition-opacity group-has-checked/yours:opacity-0">
              {ASIDES[plan.id]}
            </HandNote>
            {next && (
              <HandNote className="absolute -top-10 right-1 rotate-[5deg] opacity-0 transition-opacity group-has-checked/yours:opacity-100">
                ooh, {next.finish.toLowerCase()} ✦
              </HandNote>
            )}
            <Tape tone="mint" className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />

            <HoloTilt>
              <div
                role="img"
                aria-label={`Your card: ${profile.displayName}, ${plan.name} in ${plan.finish.toLowerCase()} finish, day ${day}`}
                className="grid"
              >
                <div aria-hidden className="[grid-area:1/1]">
                  <PlanCard plan={plan} {...own} footer={[`@${profile.handle}`, `Day ${day}`]} />
                </div>
                {next && (
                  <div
                    aria-hidden
                    className="relative [clip-path:inset(-8%_108%_-8%_-8%)] transition-[clip-path] duration-900 ease-[cubic-bezier(0.6,0,0.3,1)] [grid-area:1/1] group-has-checked/yours:[clip-path:inset(-8%_-8%_-8%_-8%)]"
                  >
                    <PlanCard plan={next} {...own} footer={[`@${profile.handle}`, "Preview"]} />
                    {/* The laminator's light, riding the edge of the new finish. */}
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
                      <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/80 to-transparent opacity-0 mix-blend-soft-light group-has-checked/yours:animate-[laminate_0.9s_cubic-bezier(0.6,0,0.3,1)]" />
                    </span>
                    <Stamp tone="lilac" className="absolute -top-3 left-4 rotate-[-5deg] bg-surface">
                      Preview
                    </Stamp>
                  </div>
                )}
              </div>
            </HoloTilt>

            <PlanSeal
              id="your-plan-seal"
              ring={`${plan.name} member ✦ since ${formatDayShort(viewer.since)} ✦ `}
              day={day}
              foil={plan.priceUsd > 0}
              className="absolute -right-7 -bottom-6 z-20 w-24 transition-[opacity,scale] duration-500 group-has-checked/yours:scale-75 group-has-checked/yours:opacity-0 sm:-right-12 sm:w-28"
            />

            {next && (
              <label className="relative z-30 mx-auto mt-14 flex w-fit cursor-pointer items-center gap-3 rounded-full border border-border bg-surface/85 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-ink shadow-soft backdrop-blur-sm select-none">
                <input type="checkbox" role="switch" className="peer sr-only" />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-ice-strong transition-colors peer-checked:bg-ocean peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ocean after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow-soft after:transition-transform peer-checked:after:translate-x-5"
                />
                Try it in {next.finish.toLowerCase()}
                <Sparkle className="size-3.5 text-lilac" />
              </label>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Your plan</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
              <h2
                id="your-plan-heading"
                className="font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-tight text-ink sm:text-[3rem]"
              >
                You’re on <span className={plan.priceUsd > 0 ? "foil-text" : ""}>{plan.name}</span>
              </h2>
              <Stamp tone="mint" className="-rotate-6">
                Active
              </Stamp>
            </div>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted">{plan.tagline}</p>

            <dl className="mt-7 grid max-w-md gap-3">
              <Fact label="Price">
                {plan.priceUsd > 0 ? (
                  <>
                    {formatPlanPrice(plan)}
                    <span className="text-sm font-semibold text-muted"> / month</span>
                  </>
                ) : (
                  "Free forever"
                )}
              </Fact>
              <Fact label="Since">{formatDay(viewer.since)}</Fact>
              <Fact label={`On ${plan.name} for`}>{age === "today" ? "Started today ✦" : age}</Fact>
            </dl>

            {next ? (
              <div className="mt-9 max-w-lg rounded-[20px] border-2 border-dashed border-border bg-canvas/70 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Upgrade to</p>
                    <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">{next.name}</p>
                  </div>
                  <p className="sm:text-right">
                    <span className="font-display text-2xl font-extrabold text-ink tabular-nums">{formatPlanPrice(next)}</span>
                    <span className="text-sm text-muted"> / month</span>
                    {plan.priceUsd > 0 && (
                      <span className="block text-xs font-semibold text-mint-ink">
                        {formatPlanStep(plan, next)} more than {plan.name}
                      </span>
                    )}
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-ink">
                  {adds(next).map((perk) => (
                    <li key={perk} className="flex gap-2.5">
                      <Sparkle className="mt-1 size-3 shrink-0 text-lilac" />
                      {perk}
                    </li>
                  ))}
                </ul>
                {/* No payments provider yet: show the way up, honestly closed. */}
                <button
                  type="button"
                  disabled
                  className="mt-5 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-action bg-ocean/12 text-[0.9375rem] font-semibold text-ocean-ink"
                >
                  <Clock aria-hidden className="size-4" />
                  Upgrade to {next.name}
                </button>
                <p className="mt-2.5 text-center text-xs text-muted">Checkout opens soon.</p>
                {beyond && (
                  <p className="mt-4 border-t border-dashed border-border pt-4 text-sm leading-relaxed text-muted">
                    Or go all the way:{" "}
                    <a href="#live" className="font-semibold text-ink underline-offset-4 hover:underline">
                      {beyond.name}
                    </a>
                    , {formatPlanPrice(beyond)} / month, with {adds(beyond).map(lowerFirst).join(" and ")}.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-9 flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Sparkle className="size-4 text-lilac" />
                You have every finish there is.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A line on the back of the card: label, dotted leader, value. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="flex flex-1 items-baseline gap-3 text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">
        <span className="shrink-0">{label}</span>
        <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-border" />
      </dt>
      <dd className="text-right font-display text-[1.0625rem] font-bold text-ink tabular-nums">{children}</dd>
    </div>
  );
}
