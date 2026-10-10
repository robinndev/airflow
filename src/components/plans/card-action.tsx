import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { getViewerPlan } from "@/lib/plan-status";
import { PLANS, includes, planDay, type Plan } from "@/lib/plans";

const note = "flex h-11 w-full items-center justify-center gap-2 rounded-action text-sm font-semibold";

/** What you can do with a card in the catalog, given the plan you're on. */
export async function CardAction({ plan }: { plan: Plan }) {
  const viewer = await getViewerPlan();

  if (viewer?.plan === plan.id) {
    return (
      <p className={`${note} bg-mint/15 text-mint-ink`}>
        <Check aria-hidden className="size-4" strokeWidth={2.75} />
        Your plan · day {planDay(viewer.since, viewer.now)}
      </p>
    );
  }
  if (viewer && includes(viewer.plan, plan.id)) {
    return <p className={`${note} bg-ice text-muted`}>Included in {PLANS[viewer.plan].name}</p>;
  }
  if (plan.priceUsd === 0) {
    return (
      <Link href="/join" className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full" })}>
        Start free
      </Link>
    );
  }
  // No payments provider yet: a ticket that says so, not a button that goes nowhere.
  return (
    <p
      className={`${note} border-2 border-dashed ${plan.id === "flow_plus" ? "border-ocean/40 text-ocean-ink" : "border-border text-muted"}`}
    >
      <Clock aria-hidden className="size-4" />
      Checkout opens soon
    </p>
  );
}
