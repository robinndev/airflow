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
      "Accent color and banner focus",
    ],
  },
  flow_plus: {
    id: "flow_plus",
    name: "Flow+",
    priceUsd: 6.99,
    tagline: "Make your profile entirely yours.",
    perks: [
      "Animated GIF profile picture and cover",
      "Fully custom profiles: button shapes, layout and more",
      "Small extras as they ship",
    ],
  },
  live: {
    // Working name: the tier's final name is still open (docs/roadmap.md).
    id: "live",
    name: "Flow+ Live",
    priceUsd: 9.99,
    tagline: "Draw live for your community.",
    perks: ["Everything in Flow+", "Live streaming", "Future features first"],
  },
};

export const formatPlanPrice = (plan: Plan) => (plan.priceUsd === 0 ? "$0" : `$${plan.priceUsd.toFixed(2)}`);
