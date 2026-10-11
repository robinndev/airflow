/*
 * Paid plans. Prices decided by the project lead on 2026-10-10; checkout
 * doesn't exist yet (payments provider undecided), so the UI shows prices but
 * never pretends you can pay. Paid plans don't change the 10% platform fee.
 */

export type PlanId = "free" | "flow_plus" | "live";

export type Plan = {
  id: PlanId;
  name: string;
  priceUsd: number;
  tagline: string;
  perks: string[];
  /** On /plans every plan is an artist trading card; the finish is how it's printed. */
  finish: string;
};

export const PLATFORM_FEE_PERCENT = 10;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    tagline: "Everything you need to show and sell your art.",
    perks: [
      "Portfolio, gallery and posts",
      "Commissions and adoptables",
      "5 themes, name color and free avatar frames",
      "An About board with up to 10 blocks",
    ],
    finish: "Matte",
  },
  flow_plus: {
    id: "flow_plus",
    name: "Flow+",
    priceUsd: 6.99,
    tagline: "Make your profile entirely yours.",
    perks: [
      "Every theme, your own colors and background images",
      "Name fonts, gradients and effects; button styles and layout",
      "Custom CSS, HTML blocks and a 60-block About board",
      "Animated GIF profile picture and cover",
    ],
    finish: "Foil",
  },
  live: {
    // Working name: the tier's final name is still open (docs/roadmap.md).
    id: "live",
    name: "Flow+ Live",
    priceUsd: 9.99,
    tagline: "Draw live for your community.",
    perks: ["Everything in Flow+", "Live streaming", "Future features first"],
    finish: "Live holo",
  },
};

/** Cheapest first. */
export const PLAN_ORDER: PlanId[] = ["free", "flow_plus", "live"];

export const formatPlanPrice = (plan: Plan) => (plan.priceUsd === 0 ? "$0" : `$${plan.priceUsd.toFixed(2)}`);

/** What moving from one plan to another adds to the monthly price: "+$3.00". */
export const formatPlanStep = (from: Plan, to: Plan) => `+$${(to.priceUsd - from.priceUsd).toFixed(2)}`;

/** Plans above this one, cheapest first. */
export const upgradesFrom = (id: PlanId) => PLAN_ORDER.slice(PLAN_ORDER.indexOf(id) + 1).map((next) => PLANS[next]);

export const includes = (id: PlanId, other: PlanId) => PLAN_ORDER.indexOf(id) >= PLAN_ORDER.indexOf(other);

const DAY = 86_400_000;

/** Day 1 is the day the plan started. */
export const planDay = (sinceIso: string, now: number) => Math.floor((now - Date.parse(sinceIso)) / DAY) + 1;

/** "today", "12 days", "3 months", "1 year and 2 months". */
export function formatPlanAge(sinceIso: string, now: number) {
  const days = planDay(sinceIso, now) - 1;
  if (days < 1) return "today";
  if (days < 61) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = `${years} ${years === 1 ? "year" : "years"}`;
  return rest ? `${y} and ${rest} ${rest === 1 ? "month" : "months"}` : y;
}
