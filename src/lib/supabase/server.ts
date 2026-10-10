import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/**
 * The signed-in user's client: reads and refreshes the session cookies.
 * Reads cookies, so call it inside <Suspense> (or in Server Actions and
 * route handlers).
 */
export async function createSupabaseServer() {
  assertSupabaseEnv();
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // Server Components can't write cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Anonymous client with no cookies, for public reads inside `"use cache"`
 * (profiles are public). Row level security still applies.
 */
export function createSupabasePublic() {
  assertSupabaseEnv();
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
