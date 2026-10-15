import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getViewer, type Viewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Artiflow's team (`public.team_members`, secret key only): admins open the
 * back office (/admin). Added and removed with `npm run team`.
 */

export type TeamRole = "admin" | "moderator";

export const TEAM_TAG = "team";

async function fetchRole(userId: string): Promise<TeamRole | null> {
  const { data, error } = await createSupabaseAdmin().from("team_members").select("role").eq("user_id", userId).maybeSingle();
  // A database without the team table has no team.
  if (error) return null;
  return (data?.role as TeamRole | undefined) ?? null;
}

/**
 * For showing the way in (the account menu). Cached for a few minutes, so a
 * removed member may still see the link that long; the page itself checks
 * again with `requireAdmin()`.
 */
export async function getTeamRole(userId: string): Promise<TeamRole | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TEAM_TAG);
  return fetchRole(userId);
}

/**
 * The back office's door: visitors go to sign in, everyone but an admin gets
 * the site's 404 (the page doesn't say it exists). Reads the session, so
 * call it inside <Suspense>.
 */
export async function requireAdmin(next = "/admin"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if ((await fetchRole(viewer.id)) !== "admin") notFound();
  return viewer;
}
