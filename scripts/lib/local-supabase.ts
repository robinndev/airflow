/**
 * The local Supabase stack (Docker, `supabase/config.toml`): reading its
 * keys, and starting it when needed. Shared by `npm run dev:local` and the
 * e2e suite. Never points anywhere but this machine.
 */
import { execSync, spawnSync } from "node:child_process";

export type LocalSupabase = {
  apiUrl: string;
  studioUrl: string;
  mailpitUrl: string;
  publishableKey: string;
  secretKey: string;
};

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

export const isLocalUrl = (url: string) => LOCAL_HOSTS.includes(new URL(url).hostname);

/** Keys and URLs of the running local stack, or null when it isn't running. */
export function readLocalSupabase(): LocalSupabase | null {
  let status: Record<string, string>;
  try {
    status = JSON.parse(execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());
  } catch {
    return null;
  }
  if (!status.API_URL) return null;
  // Hard stop: this module only ever hands out a local project.
  if (!isLocalUrl(status.API_URL)) throw new Error(`Refusing a non-local Supabase (${status.API_URL}).`);

  return {
    apiUrl: status.API_URL,
    studioUrl: status.STUDIO_URL,
    mailpitUrl: status.MAILPIT_URL ?? status.INBUCKET_URL,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    secretKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  };
}

/** Env for the app: the local stack, overriding whatever .env.local points at. */
export function localAppEnv(sb: LocalSupabase): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: sb.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.publishableKey,
    SUPABASE_SECRET_KEY: sb.secretKey,
    SUPABASE_SERVICE_ROLE_KEY: sb.secretKey,
  };
}

const dockerUp = () => spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

/** Starts Docker (macOS) and the local stack if needed, then applies new migrations. */
export function ensureLocalSupabase(): LocalSupabase {
  let sb = readLocalSupabase();

  if (!sb) {
    if (!dockerUp()) {
      if (process.platform !== "darwin") throw new Error("Docker isn't running. Start it, then try again.");
      console.log("› Starting Docker…");
      spawnSync("open", ["-a", "Docker"]);
      const deadline = Date.now() + 120_000;
      while (!dockerUp()) {
        if (Date.now() > deadline) throw new Error("Docker didn't start within 2 minutes.");
        spawnSync("sleep", ["2"]);
      }
    }
    console.log("› Starting local Supabase (first run downloads its images)…");
    const started = spawnSync("npx", ["supabase", "start"], { stdio: "inherit" });
    if (started.status !== 0) throw new Error("`supabase start` failed — see the output above.");
    sb = readLocalSupabase();
    if (!sb) throw new Error("Local Supabase started but its status can't be read.");
  }

  // Other sessions add migrations all the time: catch the local database up.
  const migrated = spawnSync("npx", ["supabase", "migration", "up", "--local", "--include-all"], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const applied = migrated.stdout?.toString().match(/Applying migration \S+/g);
  if (applied) for (const line of applied) console.log(`› ${line}`);
  if (migrated.status !== 0) throw new Error("Applying migrations to the local database failed.");

  return sb;
}
