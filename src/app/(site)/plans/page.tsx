import type { Metadata } from "next";
import { Check, Radio, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { PLANS, PLATFORM_FEE_PERCENT, formatPlanPrice, type Plan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Plans",
  description: "Free, Flow+ and Flow+ Live — pick how far you want to take your profile.",
};

/** Static: prices and perks only. Checkout lands with the payments provider. */
export default function PlansPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Plans</p>
          <h1 className="mt-3 font-display text-[2.25rem] leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-5xl">
            Your art, your space, your way
          </h1>
          <p className="mt-4 text-base leading-relaxed text-pretty text-muted">
            Start free. Upgrade when you want your profile to feel completely yours. Every plan pays the same{" "}
            {PLATFORM_FEE_PERCENT}% fee on sales — no plan changes that.
          </p>
        </header>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <PlanCard plan={PLANS.free} />
          <PlanCard plan={PLANS.flow_plus} featured />
          <PlanCard plan={PLANS.live} />
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Prices in USD, billed monthly. Paid plans open with checkout — soon.
        </p>
      </main>
    </>
  );
}

function PlanCard({ plan, featured = false }: { plan: Plan; featured?: boolean }) {
  const Icon = plan.id === "live" ? Radio : Sparkles;
  return (
    <section
      id={plan.id === "flow_plus" ? "flow-plus" : plan.id}
      aria-labelledby={`plan-${plan.id}`}
      className={`relative flex scroll-mt-24 flex-col rounded-panel border bg-surface p-6 sm:p-7 ${
        featured ? "border-transparent shadow-lift ring-2 ring-ocean" : "border-border shadow-soft"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-lilac to-ocean px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
          Recommended
        </span>
      )}

      <div className="flex items-center gap-2.5">
        {plan.id !== "free" && (
          <span className="grid size-8 place-items-center rounded-[10px] bg-ice text-ocean">
            <Icon aria-hidden className="size-4" />
          </span>
        )}
        <h2 id={`plan-${plan.id}`} className="font-display text-xl font-extrabold tracking-tight text-ink">
          {plan.name}
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted">{plan.tagline}</p>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums">
          {formatPlanPrice(plan)}
        </span>
        <span className="text-sm text-muted">{plan.priceUsd === 0 ? "forever" : "/ month"}</span>
      </p>

      <ul className="mt-6 grid gap-3 text-sm text-ink">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex gap-2.5">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-mint-strong" strokeWidth={2.5} />
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {plan.priceUsd === 0 ? (
          <p className="flex h-11 items-center justify-center rounded-action bg-ice text-sm font-semibold text-muted">
            Included with every account
          </p>
        ) : (
          // No payments provider yet: say so instead of a button that goes nowhere.
          <button
            type="button"
            disabled
            className={`flex h-11 w-full items-center justify-center rounded-action text-sm font-semibold ${
              featured ? "bg-ocean text-white" : "border border-border text-ink"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Checkout opens soon
          </button>
        )}
      </div>
    </section>
  );
}
