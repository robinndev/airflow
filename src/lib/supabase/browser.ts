import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** The signed-in user's client in the browser (shares the session cookies). Used for direct uploads. */
export function supabaseBrowser() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  return client;
}
