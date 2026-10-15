import "server-only";
import { cache } from "react";
import { PROVIDERS, type Provider } from "@/lib/auth/providers";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { deviceOf, type AccountDetails, type AccountSession, type SignInIdentity } from "./account";
import { cleanMuted, type MutableKind } from "./notifications";

/*
 * The viewer's own settings, read as the signed-in user (row level security:
 * nobody else can). Per request, never cached. Reads cookies, so call these
 * inside <Suspense>.
 */

export type ViewerSettings = { muted: MutableKind[]; hideLikeCounts: boolean };

export const DEFAULT_SETTINGS: ViewerSettings = { muted: [], hideLikeCounts: false };

/** A database that predates the migration reads as the defaults. */
const MISSING = new Set(["42P01", "PGRST205", "PGRST202", "42883"]);

export const getViewerSettings = cache(async (): Promise<ViewerSettings | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("account_settings")
    .select("muted_notifications, hide_like_counts")
    .eq("user_id", viewer.id)
    .maybeSingle<{ muted_notifications: string[]; hide_like_counts: boolean }>();
  if (error && !MISSING.has(error.code)) throw new Error(`Couldn't load your settings: ${error.message}`);
  if (!data) return DEFAULT_SETTINGS;
  return { muted: cleanMuted(data.muted_notifications), hideLikeCounts: data.hide_like_counts };
});

/** The zone the viewer shows on their profile (null: their local time is hidden). */
export const getViewerTimeZone = cache(async (): Promise<string | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("profiles").select("time_zone").eq("id", viewer.id).maybeSingle<{ time_zone: string | null }>();
  if (error) return null;
  return data?.time_zone ?? null;
});

function identityName(data: Record<string, unknown> | undefined) {
  for (const key of ["email", "preferred_username", "user_name", "name", "full_name"]) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "your account";
}

/** The session id inside the access token: which row of `my_sessions()` is this browser. */
function sessionIdOf(claims: Record<string, unknown> | undefined) {
  return typeof claims?.session_id === "string" ? claims.session_id : null;
}

/** Email, password, linked sign-ins and sessions: the account page. */
export const getAccountDetails = cache(async (): Promise<AccountDetails | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createSupabaseServer();

  const [{ data: user }, { data: claims }, password, sessions] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
    supabase.rpc("account_has_password"),
    supabase.rpc("my_sessions"),
  ]);
  if (!user.user) return null;

  const identities: SignInIdentity[] = (user.user.identities ?? []).flatMap((identity) =>
    PROVIDERS.includes(identity.provider as Provider)
      ? [{ provider: identity.provider as Provider, as: identityName(identity.identity_data) }]
      : [],
  );

  const current = sessionIdOf(claims?.claims);
  const rows = (sessions.data ?? []) as { id: string; created_at: string; last_seen: string; user_agent: string | null }[];
  const list: AccountSession[] = rows.map((row) => ({
    id: row.id,
    ...deviceOf(row.user_agent),
    signedInAt: row.created_at,
    lastSeen: row.last_seen,
    current: row.id === current,
  }));
  // This browser first, then the most recently used.
  list.sort((a, b) => Number(b.current) - Number(a.current));

  return {
    email: user.user.email ?? "",
    pendingEmail: user.user.new_email ?? null,
    // Without the migration, assume a password (the form then asks for it, which is safe).
    hasPassword: password.error ? true : password.data === true,
    identities,
    sessions: list,
  };
});
