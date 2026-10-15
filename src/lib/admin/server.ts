import "server-only";
import { PLATFORM_FEE_PERCENT } from "@/lib/plans";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildDashboard, type Dashboard, type RawDashboard } from "./metrics";
import { windowOf, type AdminQuery } from "./range";

/**
 * Everything /admin shows, fresh on every request (admins only: call after
 * `requireAdmin()`). One call to `admin_dashboard()`, which only the secret
 * key can run (for "All time", first the date of the oldest account).
 */
export async function getAdminDashboard(query: AdminQuery): Promise<Dashboard> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createSupabaseAdmin();
  const { data: first } =
    query.range === "all"
      ? await supabase.from("profiles").select("created_at").order("created_at").limit(1).maybeSingle()
      : { data: null };
  const window = windowOf(query.range, today, first?.created_at?.slice(0, 10));
  const { data, error } = await supabase.rpc("admin_dashboard", {
    p_from: window.from,
    p_to: window.to,
    p_series_from: window.seriesFrom,
    p_without_team: query.withoutTeam,
  });
  if (error) throw new Error(`The back office couldn't load: ${error.message}`);
  return buildDashboard(data as RawDashboard, window, query.fee ?? PLATFORM_FEE_PERCENT);
}
