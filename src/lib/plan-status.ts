import "server-only";
import { cache } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { getViewer } from "@/lib/session";
import { createSupabasePublic } from "@/lib/supabase/server";

export type ViewerPlan = {
  handle: string;
  plan: PlanId;
  /** When the current plan started (`profiles.plan_since`, kept by a trigger). */
  since: string;
  /** Read once per request, so every part of the page counts days the same way. */
  now: number;
};

const toPlanId = (plan: string): PlanId => (plan in PLANS ? (plan as PlanId) : "free");

/**
 * The signed-in artist's plan and how long they've had it. Read fresh, not
 * cached: plans change from the team's script, outside the app's cache tags.
 * Deduped per request. Reads cookies, so call it inside <Suspense>.
 */
export const getViewerPlan = cache(async (): Promise<ViewerPlan | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;

  const { data, error } = await createSupabasePublic()
    .from("profiles")
    .select("plan, plan_since")
    .eq("id", viewer.id)
    .maybeSingle<{ plan: string; plan_since: string }>();
  if (error) throw new Error(`Couldn't load your plan: ${error.message}`);
  if (!data) return null;

  // getViewer() awaited connection(), so reading the clock is allowed here.
  return { handle: viewer.handle, plan: toPlanId(data.plan), since: data.plan_since, now: Date.now() };
});
