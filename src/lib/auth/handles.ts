/*
 * Handle rules, shared by the sign-up form (instant feedback) and the server
 * (the real check). A handle is the profile URL — artiflow.com/<handle> — so
 * it can't shadow a top-level route.
 */

export const HANDLE_MAX = 20;

/** 3–20 characters: a–z, 0–9, "_" and inner dots (marigold.ink), no "..". */
const HANDLE_PATTERN = /^(?!.*\.\.)[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$/;

/** Top-level routes and words that would confuse people as someone's page. */
const RESERVED = new Set([
  "about", "admin", "api", "artiflow", "cart", "commissions", "customize", "explore", "favorites", "feed", "help",
  "home", "join", "login", "logout", "messages", "mod", "moodboard", "new", "notifications", "orders", "plans",
  "pricing", "privacy", "saved", "search", "settings", "shop", "sign-in", "signin", "signup", "staff", "support",
  "terms",
]);

/** What people type ("@Nova ") → what we store ("nova"). */
export function normalizeHandleInput(raw: string) {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isReservedHandle(handle: string) {
  return RESERVED.has(handle);
}

/** A human reason the handle can't be used as typed, or null if the shape is fine. */
export function handleProblem(handle: string): string | null {
  if (handle.length < 3) return "At least 3 characters.";
  if (handle.length > HANDLE_MAX) return `Up to ${HANDLE_MAX} characters.`;
  if (/[^a-z0-9_.]/.test(handle)) return "Letters, numbers, dots and underscores only.";
  if (!HANDLE_PATTERN.test(handle)) return "Dots can't start, end or double up.";
  return null;
}
