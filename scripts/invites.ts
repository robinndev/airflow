/**
 * Artist codes are granted by the team, to specific artists, who pass them on.
 * Holding codes makes you an artist too (a founding artist).
 *
 *   npm run invites -- grant @handle [count] ["why"]   new single-use artist codes
 *   npm run invites -- list @handle                    what they hold, and who used each
 *   npm run invites -- artist @handle                  give artist access by hand (no code)
 *   npm run invites -- collector @handle               take it back (their listings stay; they can't add new ones)
 *   npm run invites -- verify @handle                  verify an artist by hand (no codes: those come with the goals)
 *   npm run invites -- unverify @handle                take verification back
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
  console.log(`Granted ${data.length} artist code${data.length === 1 ? "" : "s"} to @${handle} (now an artist):`);
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
  const { data: access } = await supabase.from("profiles").select("artist_since, verified_at").eq("id", profile.id).maybeSingle();
  console.log(
    `@${handle}: ${access?.artist_since ? `artist since ${String(access.artist_since).slice(0, 10)}` : "collector"}${access?.verified_at ? `, verified since ${String(access.verified_at).slice(0, 10)}` : ""}`,
  );
  if (data.length === 0) console.log(`@${handle} holds no artist codes.`);
  for (const row of data) {
    const status = row.redeemed ? `used by @${row.redeemed.handle}` : row.redeemed_at ? "used" : "unused";
    console.log(`  ${row.code}  ${status}${row.note ? `  (${row.note})` : ""}`);
  }
} else if ((command === "artist" || command === "collector") && handle) {
  const { data, error } = await supabase.rpc("set_artist_access", { handle, artist: command === "artist" });
  if (error) throw new Error(error.message);
  console.log(data ? `@${handle} is an artist (since ${String(data).slice(0, 10)}).` : `@${handle} is a collector now.`);
} else if ((command === "verify" || command === "unverify") && handle) {
  const { data, error } = await supabase.rpc("set_verified", { handle, verified: command === "verify" });
  if (error) throw new Error(error.message);
  console.log(data ? `@${handle} is verified (since ${String(data).slice(0, 10)}).` : `@${handle} isn't verified now.`);
} else {
  console.log(
    "Usage:\n  npm run invites -- grant @handle [count] [\"why\"]\n  npm run invites -- list @handle\n  npm run invites -- artist @handle\n  npm run invites -- collector @handle\n  npm run invites -- verify @handle\n  npm run invites -- unverify @handle",
  );
  process.exitCode = 1;
}
