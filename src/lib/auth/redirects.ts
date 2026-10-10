import { headers } from "next/headers";

/** Only same-site paths, so `?next=` can't bounce anyone to another site. */
export function safeNext(value: unknown, fallback = "/") {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : fallback;
}

/** This deployment's origin, for links in auth emails and OAuth redirects. */
export async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
