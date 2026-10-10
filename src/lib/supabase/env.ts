/*
 * Supabase project settings, provisioned by the Vercel Marketplace
 * integration (`vercel env pull` writes them to .env.local). Newer projects
 * hand out publishable/secret keys; older ones anon/service-role keys.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Safe in the browser: every query it makes is filtered by row level security. */
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error("Supabase isn't configured. Run `vercel env pull .env.local` to fetch its keys.");
  }
}
