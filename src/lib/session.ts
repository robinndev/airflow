import { cookies } from "next/headers";
import { cache } from "react";
import { connection } from "next/server";
import { getHandleForUser } from "@/lib/profile/queries";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { createSupabaseServer } from "@/lib/supabase/server";

export const PREVIEW_AS_VISITOR_COOKIE = "artiflow-preview-visitor";

export type Viewer = { id: string; handle: string };

/**
 * The signed-in artist, from the Supabase session. Owners can preview their
 * profile the way visitors see it (cookie). Accounts made with a social login
 * have no handle until onboarding and count as signed out for now. Reads
 * cookies, so call it inside <Suspense>.
 */
export const getViewer = cache(async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  if (store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1") return null;
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return null;
  if (!store.getAll().some((cookie) => cookie.name.startsWith("sb-"))) return null;

  // Token checks read the clock: resolve the viewer at request time, never in a prerender.
  await connection();
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const handle = await getHandleForUser(userId);
  return handle ? { id: userId, handle } : null;
});

export async function isPreviewingAsVisitor() {
  const store = await cookies();
  return store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1";
}
