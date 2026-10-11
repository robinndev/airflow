import type { SocialLink, SocialPlatform } from "./types";

/*
 * Profile links: artists paste any address; the platform (and its icon) is
 * recognized from the host, everything else is a plain website.
 */

const HOSTS: [RegExp, SocialPlatform, string][] = [
  [/(^|\.)instagram\.com$/, "instagram", "Instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok", "TikTok"],
  [/(^|\.)(x|twitter)\.com$/, "x", "X"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube", "YouTube"],
  [/(^|\.)twitch\.tv$/, "twitch", "Twitch"],
  [/(^|\.)bsky\.app$/, "bluesky", "Bluesky"],
  [/(^|\.)ko-fi\.com$/, "kofi", "Ko-fi"],
];

export const MAX_LINKS = 8;

/** "instagram.com/me" → "https://instagram.com/me"; null if it isn't a usable web address. */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function toSocialLink(url: string, label?: string): SocialLink {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const match = HOSTS.find(([pattern]) => pattern.test(host));
  return {
    platform: match?.[1] ?? "website",
    label: label?.trim() || match?.[2] || host,
    url,
  };
}
