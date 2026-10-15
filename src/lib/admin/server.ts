import "server-only";
import { PLATFORM_FEE_PERCENT } from "@/lib/plans";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildDashboard, type Dashboard, type RawDashboard } from "./metrics";
import { windowOf, type AdminQuery } from "./range";

/**
 * Everything /admin shows, fresh on every request (admins only: call after
 * `requireAdmin()`). One call to `admin_dashboard()`, which only the secret
 * key can run.
 */
export async function getAdminDashboard(query: AdminQuery): Promise<Dashboard> {
  const today = new Date().toISOString().slice(0, 10);
  const window = windowOf(query.range, today);
  const { data, error } = await createSupabaseAdmin().rpc("admin_dashboard", {
    p_from: window.from,
    p_to: window.to,
    p_series_from: window.seriesFrom,
    p_without_team: query.withoutTeam,
  });
  if (error) throw new Error(`The back office couldn't load: ${error.message}`);
  return buildDashboard(data as RawDashboard, window, query.fee ?? PLATFORM_FEE_PERCENT);
}
