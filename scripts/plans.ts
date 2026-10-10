/**
 * Sets an artist's plan until billing exists. People can't change their own.
 * Changing it restarts `plan_since` (a database trigger), which /plans counts from.
 *
 *   npm run plans -- set @handle flow_plus     (or free)
 *   npm run plans -- show @handle
 *
 * Uses the Supabase secret key from .env.local (`vercel env pull .env.local`).
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase keys in .env.local. Run `vercel env pull .env.local`.");

const PLANS = ["free", "flow_plus"];
const supabase = createClient(url, key, { auth: { persistSession: false } });
const [command, rawHandle, plan] = process.argv.slice(2);
const handle = rawHandle?.replace(/^@/, "").toLowerCase();

if (command === "set" && handle && PLANS.includes(plan)) {
  const { data, error } = await supabase.from("profiles").update({ plan }).eq("handle", handle).select("handle, plan");
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error(`No artist with the handle @${handle}`);
  console.log(`@${handle} is now on ${plan}.`);
} else if (command === "show" && handle) {
  const { data } = await supabase.from("profiles").select("plan, plan_since").eq("handle", handle).maybeSingle();
  console.log(data ? `@${handle}: ${data.plan} since ${data.plan_since}` : `No artist with the handle @${handle}`);
} else {
  console.log(`Usage:\n  npm run plans -- set @handle ${PLANS.join("|")}\n  npm run plans -- show @handle`);
  process.exitCode = 1;
}
