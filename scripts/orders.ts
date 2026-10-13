/**
 * Commission orders, for the team, until checkout exists. Nobody can mark
 * their own order paid; this is how a test order gets past "Awaiting payment"
 * (decided 2026-10-12: the flow stops there until the payments provider).
 *
 *   npm run orders -- list @artist             open orders (newest first)
 *   npm run orders -- paid <order id>          a quoted order → paid (Up next)
 *
 * Add --local to work on the local Supabase stack instead of .env.local's project.
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

const supabase = createClient(url, key, { auth: { persistSession: false } });
const [command, target] = args;

if (command === "list" && target) {
  const handle = target.replace(/^@/, "").toLowerCase();
  const { data: artist } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!artist) throw new Error(`No artist with the handle @${handle}`);
  const { data, error } = await supabase
    .from("commission_requests")
    .select("id, service_title, status, quote_usd, estimate_usd, created_at, buyer:profiles!commission_requests_buyer_id_fkey(handle)")
    .eq("artist_id", artist.id)
    .not("status", "in", "(declined,cancelled,expired,delivered)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!data.length) console.log(`@${handle} has no open orders.`);
  for (const row of data) {
    const buyer = (row.buyer as unknown as { handle: string } | null)?.handle ?? "?";
    const price = row.quote_usd ?? row.estimate_usd;
    console.log(`${row.id}  ${row.status.padEnd(11)} $${price ?? "—"}  ${row.service_title}  (from @${buyer})`);
  }
} else if (command === "paid" && target) {
  const { data, error } = await supabase
    .from("commission_requests")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", target)
    .eq("status", "quoted")
    .gt("quote_expires_at", new Date().toISOString())
    .select("service_title, quote_usd")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No quoted order with that id (it has to have a quote that hasn't expired).");
  console.log(`Marked paid: ${data.service_title}, $${data.quote_usd}. It's in the artist's Up next.`);
} else {
  console.log("Usage:\n  npm run orders -- list @artist [--local]\n  npm run orders -- paid <order id> [--local]");
  process.exitCode = 1;
}
