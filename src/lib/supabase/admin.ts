import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Bypasses row level security. Server-only, for the few things a visitor
 * can't do with their own key: finding the email behind a handle at sign-in
 * and looking up invite codes. Never pass its results to the client as-is.
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("Supabase's secret key is missing. Run `vercel env pull .env.local`.");
  }
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
