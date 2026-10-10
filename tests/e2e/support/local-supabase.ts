import { execSync } from "node:child_process";

/*
 * The e2e suite runs against the local Supabase stack (`npx supabase start`),
 * never the hosted project: tests create real accounts and read the
 * confirmation emails from the stack's Mailpit inbox.
 */

export type LocalSupabase = {
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
  mailpitUrl: string;
};

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  if (cached) return cached;

  let status: Record<string, string>;
  try {
    status = JSON.parse(execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());
  } catch {
    throw new Error("Local Supabase isn't running. Start it with `npx supabase start` (needs Docker).");
  }

  const apiUrl = status.API_URL;
  // Hard stop: never point the suite at a hosted project.
  if (!apiUrl || !["127.0.0.1", "localhost"].includes(new URL(apiUrl).hostname)) {
    throw new Error(`Refusing to run e2e tests against a non-local Supabase (${apiUrl}).`);
  }

  cached = {
    apiUrl,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    secretKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
    mailpitUrl: status.MAILPIT_URL ?? status.INBUCKET_URL,
  };
  return cached;
}

/** Env for the app under test: the local stack, overriding whatever .env.local points at. */
export function appEnv(): Record<string, string> {
  const sb = localSupabase();
  return {
    NEXT_PUBLIC_SUPABASE_URL: sb.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.publishableKey,
    SUPABASE_SECRET_KEY: sb.secretKey,
    SUPABASE_SERVICE_ROLE_KEY: sb.secretKey,
  };
}
