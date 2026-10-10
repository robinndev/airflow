import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirects";
import { fetchHandleForUser } from "@/lib/profile/accounts";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Where links from auth emails (confirm sign-up, reset password) and social
 * sign-ins land. Trades the one-time code or token for a session cookie,
 * then continues to `next`. Handles both the PKCE `code` Supabase sends by
 * default and the `token_hash` form of custom email templates.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServer();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  if (!ok) redirect("/sign-in?error=link");

  // First social sign-in: no profile yet, so pick a handle before anything else.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId && !(await fetchHandleForUser(userId))) redirect(`/join/handle?next=${encodeURIComponent(next)}`);
  redirect(next);
}
