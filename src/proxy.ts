import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Keeps Supabase sessions fresh: refreshes an expiring access token once
 * per navigation and writes the new cookies before the page renders.
 * Visitors without a session cookie pass straight through.
 */
export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSession || !SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const userAgent = request.headers.get("user-agent");
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    // Refreshing a session records the browser it's in (Settings → "Where you're signed in").
    ...(userAgent && { global: { headers: { "user-agent": userAgent } } }),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates the token (refreshing it if needed); don't put code between this and the return.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo-art/|defaults/|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico)$).*)"],
};
