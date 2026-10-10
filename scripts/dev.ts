/**
 * Runs the app on this machine against one of two backends:
 *
 *   npm run dev:local       → local Supabase in Docker (throwaway data, emails in Mailpit)
 *   npm run dev:production  → the real Supabase project from .env.local (real users!)
 *
 * Each mode builds into its own folder (.next-local / .next), so their caches
 * never mix and both can run at the same time (ports 3001 and 3000).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ensureLocalSupabase, isLocalUrl, localAppEnv } from "./lib/local-supabase.ts";

type Mode = "local" | "production";

const mode = process.argv[2] as Mode;
if (mode !== "local" && mode !== "production") {
  console.error("Usage: node scripts/dev.ts <local|production>");
  process.exit(1);
}

const root = path.join(import.meta.dirname, "..");
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const color = (code: number, s: string) => `\x1b[${code}m${s}\x1b[0m`;

function banner(lines: string[], tone: number) {
  const width = Math.max(...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").length)) + 4;
  const bar = color(tone, "━".repeat(width));
  console.log(`\n${bar}`);
  for (const line of lines) console.log(`  ${line}`);
  console.log(`${bar}\n`);
}

/** NEXT_PUBLIC_SUPABASE_URL from .env.local, without loading the rest. */
function envLocalSupabaseUrl() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\n]+)/m);
  return line?.[1] ?? null;
}

let port: number;
let env: Record<string, string>;

try {
  if (mode === "local") {
    const sb = ensureLocalSupabase();
    port = 3001;
    env = { ...localAppEnv(sb), NEXT_DIST_DIR: ".next-local", NEXT_PUBLIC_SITE_URL: `http://localhost:${port}` };
    banner(
      [
        `${bold(color(36, "LOCAL"))}  app → ${bold(`http://localhost:${port}`)}`,
        `Supabase ${sb.apiUrl}  ·  Studio ${sb.studioUrl}  ·  Emails ${sb.mailpitUrl}`,
        "Throwaway data on this machine. Sign-up emails land in Mailpit.",
      ],
      36,
    );
  } else {
    const url = envLocalSupabaseUrl();
    if (!url) throw new Error("No .env.local with Supabase keys. Run `vercel env pull .env.local` first.");
    if (isLocalUrl(url)) throw new Error(".env.local points at a local Supabase, not production.");
    port = 3000;
    env = { NEXT_DIST_DIR: ".next" };
    banner(
      [
        `${bold(color(31, "PRODUCTION DATA"))}  app → ${bold(`http://localhost:${port}`)}`,
        `Supabase ${new URL(url).host}`,
        color(33, "Real accounts, posts and storage: anything you create or delete here is live."),
      ],
      31,
    );
  }
} catch (error) {
  console.error(color(31, `✗ ${error instanceof Error ? error.message : error}`));
  process.exit(1);
}

// Demo artwork (git-ignored) is fetched once and cached.
spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/fetch-demo-art.ts"], {
  cwd: root,
  stdio: "ignore",
});

const next = spawn("npx", ["next", "dev", "--port", String(port)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ...env },
});
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => next.kill(signal));
