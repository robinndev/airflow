"use server";

import { createClient, type AuthError } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PASSWORD_MIN, passwordStrength } from "@/lib/auth/password";
import { enabledProviders } from "@/lib/auth/enabled-providers";
import { PROVIDER_NAMES, PROVIDERS, type Provider } from "@/lib/auth/providers";
import { siteOrigin } from "@/lib/auth/redirects";
import { profileTag } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { cleanMuted } from "@/lib/settings/notifications";
import { isTimeZone } from "@/lib/settings/time";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Settings, saved as the signed-in user: email and password through Supabase
 * Auth, linked sign-ins, sessions, and the rows the user may write under row
 * level security (account_settings, profiles.time_zone). Every action checks
 * the session first.
 */

export type SaveResult = { ok: true } | { ok: false; error: string };
export type FormState = { ok: true; message: string } | { ok: false; error?: string; fields?: Record<string, string> } | null;

const SIGN_IN_AGAIN = "Your session ended. Sign in again, then try once more.";
const isRateLimit = (error: AuthError) => error.status === 429 || /rate limit/i.test(error.message);

const settingsPath = (tab = "") => `/settings${tab}`;

/* ------------------------------------------------------------------- email */

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("That doesn't look like an email address."));

export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, fields: { email: parsed.error.issues[0].message } };

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email === parsed.data) return { ok: false, fields: { email: "That's already your email." } };

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(settingsPath("?email=changed"))}` },
  );
  if (error) {
    if (error.code === "email_exists") return { ok: false, fields: { email: "Another account already uses that email." } };
    if (isRateLimit(error)) return { ok: false, error: "We just sent links. Give it a few minutes, then try again." };
    return { ok: false, error: "Couldn't start the change. Try again in a moment." };
  }
  return { ok: true, message: `Links are on their way to ${data.user?.email ?? "your current address"} and ${parsed.data}. Open both to finish.` };
}

/* ---------------------------------------------------------------- password */

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(72, "That's a little too long — 72 characters max.")
  .refine((p) => passwordStrength(p) >= 2, "Too easy to guess. Try a longer one.");

/**
 * Checks the current password with a throwaway session (Supabase's own sign-in,
 * with its rate limits), then signs that session out again.
 */
async function passwordMatches(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return isRateLimit(error) ? "rate" : false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  const parsed = newPassword.safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, fields: { password: parsed.error.issues[0].message } };

  const supabase = await createSupabaseServer();
  const [{ data }, { data: hasPassword }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("account_has_password")]);
  if (!data.user?.email) return { ok: false, error: SIGN_IN_AGAIN };

  // Setting a first password (social sign-ups) needs none; changing one needs the current one.
  if (hasPassword !== false) {
    const current = String(formData.get("current") ?? "");
    if (!current) return { ok: false, fields: { current: "Enter your current password." } };
    const matches = await passwordMatches(data.user.email, current);
    if (matches === "rate") return { ok: false, error: "Too many tries in a row. Wait a minute and try again." };
    if (!matches) return { ok: false, fields: { current: "That isn't your current password." } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return { ok: false, fields: { password: "That's your current password. Pick a new one." } };
    return { ok: false, error: "Couldn't save your new password. Try again in a moment." };
  }
  return {
    ok: true,
    message: hasPassword === false ? "Password set. You can now sign in with your email or handle too." : "Password changed.",
  };
}

/** "Forgot it?": a reset link to the account's own email. */
export async function sendPasswordReset(): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return { ok: false, error: SIGN_IN_AGAIN };
  const { error } = await supabase.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/new-password`,
  });
  if (error) {
    return { ok: false, error: isRateLimit(error) ? "We just sent one. Give it a few minutes." : "Couldn't send the link. Try again." };
  }
  return { ok: true };
}

/* -------------------------------------------------------- ways to sign in */

const isProvider = (value: unknown): value is Provider => PROVIDERS.includes(value as Provider);

/** Connects Google, Discord or Twitch to this account: off to the provider, back to settings. */
export async function connectProvider(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/settings");
  const provider = formData.get("provider");
  if (!isProvider(provider) || !(await enabledProviders()).includes(provider)) redirect(settingsPath("?auth_error=provider"));

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(settingsPath(`?linked=${provider}`))}` },
  });
  if (error || !data.url) {
    redirect(settingsPath(`?auth_error=${error?.code === "manual_linking_disabled" ? "linking_off" : "provider"}`));
  }
  redirect(data.url);
}

export async function disconnectProvider(provider: string): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  if (!isProvider(provider)) return { ok: false, error: "That isn't a way to sign in." };

  const supabase = await createSupabaseServer();
  const [{ data }, { data: hasPassword }] = await Promise.all([supabase.auth.getUserIdentities(), supabase.rpc("account_has_password")]);
  const identities = data?.identities ?? [];
  const identity = identities.find((i) => i.provider === provider);
  if (!identity) return { ok: true };
  // Never strand an account: keep at least one other way in.
  const others = identities.filter((i) => i !== identity && (i.provider !== "email" || hasPassword !== false));
  if (others.length === 0 && hasPassword === false) {
    return { ok: false, error: `${PROVIDER_NAMES[provider]} is your only way in. Set a password or connect another account first.` };
  }

  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "single_identity_not_deletable"
          ? `${PROVIDER_NAMES[provider]} is your only way in. Connect another account first.`
          : "Couldn't disconnect it. Try again in a moment.",
    };
  }
  return { ok: true };
}

/* ---------------------------------------------------------------- sessions */

export async function endSession(sessionId: string): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  if (!z.uuid().safeParse(sessionId).success) return { ok: false, error: "That session isn't here." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("end_my_session", { session: sessionId });
  if (error) return { ok: false, error: "Couldn't sign it out. Try again in a moment." };
  return { ok: true };
}

export async function signOutOtherSessions(): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, error: "Couldn't sign the others out. Try again in a moment." };
  return { ok: true };
}

/* ----------------------------------------------------- notifications, privacy */

type SettingsPatch = { muted_notifications?: string[]; hide_like_counts?: boolean };

async function saveSettings(patch: SettingsPatch): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  const supabase = await createSupabaseServer();
  // The row starts with the defaults; user_id comes from the session (auth.uid()).
  const { error } = await supabase.from("account_settings").upsert(patch, { onConflict: "user_id" });
  if (error?.code === "42P01" || error?.code === "PGRST205") return { ok: false, error: "Settings aren't switched on for this database yet (pending migration)." };
  if (error) return { ok: false, error: "Couldn't save that. Try again in a moment." };
  return { ok: true };
}

/** The guest book entries to leave out (the always-on kinds can't be muted). */
export async function saveMutedNotifications(muted: unknown): Promise<SaveResult> {
  if (!Array.isArray(muted) || muted.length > 20) return { ok: false, error: "That list doesn't look right." };
  return saveSettings({ muted_notifications: cleanMuted(muted) });
}

export async function saveHideLikeCounts(hide: unknown): Promise<SaveResult> {
  if (typeof hide !== "boolean") return { ok: false, error: "That doesn't look right." };
  return saveSettings({ hide_like_counts: hide });
}

/** Shows your local time on your profile (a zone), or hides it (null). */
export async function saveLocalTime(zone: unknown): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGN_IN_AGAIN };
  if (zone !== null && !isTimeZone(zone)) return { ok: false, error: "Pick a time zone from the list." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({ time_zone: zone }).eq("id", viewer.id);
  if (error?.code === "42703") return { ok: false, error: "Local time isn't switched on for this database yet (pending migration)." };
  if (error) return { ok: false, error: "Couldn't save that. Try again in a moment." };
  updateTag(profileTag(viewer.handle));
  return { ok: true };
}
