import type { Provider } from "@/lib/auth/providers";

/*
 * The account page's view of Supabase Auth (client-safe types and helpers).
 * Read on the server by `getAccountDetails()` (server.ts), always as the
 * signed-in user.
 */

export type SignInIdentity = {
  provider: Provider;
  /** What the provider calls them: an email, a username. */
  as: string;
};

export type AccountSession = {
  id: string;
  /** "Chrome on macOS", from the browser's user agent. */
  device: string;
  kind: "phone" | "computer";
  signedInAt: string;
  lastSeen: string;
  current: boolean;
};

export type AccountDetails = {
  email: string;
  /** An email change waiting on its confirmation links. */
  pendingEmail: string | null;
  hasPassword: boolean;
  identities: SignInIdentity[];
  sessions: AccountSession[];
};

/**
 * "robin@gmail.com" → "r•••n@gmail.com": enough to recognize, not enough to
 * read off a stream or a screenshot. Short names keep only their first letter.
 */
export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  const dots = "•".repeat(Math.min(Math.max(name.length - 2, 3), 8));
  const masked = name.length <= 3 ? `${name[0]}${dots}` : `${name[0]}${dots}${name.at(-1)}`;
  return `${masked}${email.slice(at)}`;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string, AccountSession["kind"]][] = [
  [/iPhone/, "iPhone", "phone"],
  [/iPad/, "iPad", "phone"],
  [/Android.*Mobile/, "Android", "phone"],
  [/Android/, "Android tablet", "phone"],
  [/Mac OS X|Macintosh/, "macOS", "computer"],
  [/Windows/, "Windows", "computer"],
  [/CrOS/, "ChromeOS", "computer"],
  [/Linux/, "Linux", "computer"],
];

/** A browser's user agent as people say it: "Chrome on macOS", "Safari on iPhone". */
export function deviceOf(userAgent: string | null): { device: string; kind: AccountSession["kind"] } {
  const ua = userAgent ?? "";
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(ua));
  if (!browser && !system) return { device: "An unknown browser", kind: "computer" };
  if (!system) return { device: browser!, kind: "computer" };
  return { device: browser ? `${browser} on ${system[1]}` : system[1], kind: system[2] };
}
