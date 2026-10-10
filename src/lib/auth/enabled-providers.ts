import { cacheLife, cacheTag } from "next/cache";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { PROVIDERS, type Provider } from "./providers";

/**
 * The social logins switched on in Supabase (Authentication → Sign In /
 * Providers), read from its public settings so turning one on there is all
 * it takes. The rest stay visible, faded and disabled.
 */
export async function enabledProviders(): Promise<Provider[]> {
  "use cache";
  // Refreshes about once a minute. Shorter lifetimes (expire under 5 min)
  // would make the sign-in pages dynamic instead of prerendered.
  cacheLife("minutes");
  cacheTag("auth-providers");

  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLIC_KEY } });
    if (!res.ok) return [];
    const { external } = (await res.json()) as { external?: Record<string, boolean> };
    return PROVIDERS.filter((provider) => external?.[provider] === true);
  } catch {
    return [];
  }
}
