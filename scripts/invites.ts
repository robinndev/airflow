/**
 * Invites are granted by the team, to specific artists, who pass them on.
 *
 *   npm run invites -- grant @handle [count] ["why"]   new single-use codes
 *   npm run invites -- list @handle                    what they hold, and who used each
 *
 * Uses the Supabase secret key from .env.local (`vercel env pull .env.local`).
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase keys in .env.local. Run `vercel env pull .env.local`.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const [command, rawHandle, ...rest] = process.argv.slice(2);
const handle = rawHandle?.replace(/^@/, "").toLowerCase();

type Row = { code: string; note: string | null; redeemed_at: string | null; redeemed: { handle: string } | null };

if (command === "grant" && handle) {
  const count = Number(rest[0] ?? 1);
  const { data, error } = await supabase.rpc("grant_invites", { handle, how_many: count, why: rest[1] ?? null });
  if (error) throw new Error(error.message);
  console.log(`Granted ${data.length} invite${data.length === 1 ? "" : "s"} to @${handle}:`);
  for (const code of data as string[]) console.log(`  ${code}`);
} else if (command === "list" && handle) {
  const { data: profile } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!profile) throw new Error(`No artist with the handle @${handle}`);
  const { data, error } = await supabase
    .from("invites")
    .select("code, note, redeemed_at, redeemed:profiles!invites_redeemed_by_fkey(handle)")
    .eq("inviter_id", profile.id)
    .order("created_at")
    .returns<Row[]>();
  if (error) throw new Error(error.message);
  if (data.length === 0) console.log(`@${handle} holds no invites.`);
  for (const row of data) {
    const status = row.redeemed ? `used by @${row.redeemed.handle}` : row.redeemed_at ? "used" : "unused";
    console.log(`  ${row.code}  ${status}${row.note ? `  (${row.note})` : ""}`);
  }
} else {
  console.log("Usage:\n  npm run invites -- grant @handle [count] [\"why\"]\n  npm run invites -- list @handle");
  process.exitCode = 1;
}
