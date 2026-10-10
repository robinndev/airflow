export type Provider = "google" | "discord" | "twitch";

export const PROVIDER_NAMES: Record<Provider, string> = { google: "Google", discord: "Discord", twitch: "Twitch" };

/** Where our artists already have accounts: everyone has Google; the OC and
 * adoptables scene lives on Discord; VTubers and streamers on Twitch. */
export const PROVIDERS = Object.keys(PROVIDER_NAMES) as Provider[];
