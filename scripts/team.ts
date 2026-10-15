/**
 * Artiflow's team: admins open the back office (/admin). Nobody can add
 * themselves; this (secret key) is the only way in.
 *
 *   npm run team -- list
 *   npm run team -- add @handle [admin|moderator]
 *   npm run team -- remove @handle
 *
 * Add --local to work on the local Supabase stack instead of .env.local's project.
 * The account menu's "Back office" link may take a few minutes to follow;
 * the page itself checks on every visit.
 */
import { createClient } from "@supabase/supabase-js";
import { readLocalSupabase } from "./lib/local-supabase.ts";

const args = process.argv.slice(2).filter((a) => a !== "--local");
const local = process.argv.includes("--local");

let url: string | undefined;
let key: string | undefined;
if (local) {
  const sb = readLocalSupabase();
  if (!sb) throw new Error("The local Supabase stack isn't running (npx supabase start).");
  ({ apiUrl: url, secretKey: key } = sb);
} else {
  process.loadEnvFile(".env.local");
  url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}
if (!url || !key) throw new Error("Missing Supabase keys. Run `vercel env pull .env.local`, or pass --local.");

const ROLES = ["admin", "moderator"];
const supabase = createClient(url, key, { auth: { persistSession: false } });
const [command, rawHandle, role = "admin"] = args;
const handle = rawHandle?.replace(/^@/, "").toLowerCase();

async function idOf(handle: string) {
  const { data } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!data) throw new Error(`No account with the handle @${handle}`);
  return data.id as string;
}

if (command === "list") {
  const { data, error } = await supabase
    .from("team_members")
    .select("role, added_at, profile:profiles!team_members_user_id_fkey(handle, display_name)")
    .order("added_at");
  if (error) throw new Error(error.message);
  if (!data.length) console.log("Nobody on the team yet.");
  for (const row of data) {
    const profile = row.profile as unknown as { handle: string; display_name: string } | null;
    console.log(`@${profile?.handle ?? "?"}  ${row.role.padEnd(9)}  since ${row.added_at.slice(0, 10)}  (${profile?.display_name ?? ""})`);
  }
} else if (command === "add" && handle && ROLES.includes(role)) {
  const { error } = await supabase.from("team_members").upsert({ user_id: await idOf(handle), role });
  if (error) throw new Error(error.message);
  console.log(`@${handle} is on the team as ${role}.`);
} else if (command === "remove" && handle) {
  const { data, error } = await supabase.from("team_members").delete().eq("user_id", await idOf(handle)).select("role");
  if (error) throw new Error(error.message);
  console.log(data.length ? `@${handle} is off the team.` : `@${handle} wasn't on the team.`);
} else {
  console.log(`Usage:\n  npm run team -- list\n  npm run team -- add @handle [${ROLES.join("|")}]\n  npm run team -- remove @handle\n  (add --local for the local stack)`);
  process.exitCode = 1;
}
