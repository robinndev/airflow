import { localAppEnv, readLocalSupabase, type LocalSupabase } from "../../../scripts/lib/local-supabase.ts";

/*
 * The e2e suite runs against the local Supabase stack (`npx supabase start`,
 * or just `npm run dev:local` once), never the hosted project: tests create
 * real accounts and read the confirmation emails from the stack's Mailpit.
 */

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  cached ??= readLocalSupabase() ?? undefined;
  if (!cached) throw new Error("Local Supabase isn't running. Start it with `npx supabase start` (needs Docker).");
  return cached;
}

/** Env for the app under test: the local stack, overriding whatever .env.local points at. */
export const appEnv = () => localAppEnv(localSupabase());
