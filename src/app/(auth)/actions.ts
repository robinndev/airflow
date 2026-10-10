"use server";

import type { AuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { handleProblem, isReservedHandle, normalizeHandleInput } from "@/lib/auth/handles";
import { INVITE_ERRORS, lookupInvite, type Invite } from "@/lib/auth/invites";
import { PASSWORD_MIN, passwordStrength } from "@/lib/auth/password";
import { enabledProviders } from "@/lib/auth/enabled-providers";
import { safeNext, siteOrigin } from "@/lib/auth/redirects";
import { fetchHandleForUser, isHandleRegistered } from "@/lib/profile/accounts";
import { db } from "@/lib/profile/mock-db";
import { profileTag, userTag } from "@/lib/profile/queries";
import { PREVIEW_AS_VISITOR_COOKIE } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabasePublic, createSupabaseServer } from "@/lib/supabase/server";

/*
 * Accounts live in Supabase Auth; each one gets a public profile row (handle,
 * invite) from a database trigger at sign-up. People sign in with their
 * email or their handle. Error messages never reveal whether an account
 * exists.
 */

type Field = "login" | "email" | "password" | "handle" | "terms" | "invite";
export type FieldErrors = Partial<Record<Field, string>>;

export type SignInState = { error?: string; fields?: FieldErrors } | null;
export type ResetState = { sent: string } | { error: string } | null;
export type NewPasswordState = { error?: string; fields?: FieldErrors } | null;
export type ClaimState = { error?: string; fields: FieldErrors } | null;
export type SignUpState =
  | { ok: true; handle: string; email: string; inviter?: string; confirmEmail: boolean }
  | { ok: false; error?: string; fields: FieldErrors }
  | null;

export type HandleCheck =
  | { handle: string; status: "available" }
  | { handle: string; status: "taken"; suggestions: string[] }
  | { handle: string; status: "invalid"; message: string };

export type InviteCheck = { ok: true; invite: Invite } | { ok: false; error: string };

const WRONG_LOGIN = "That email or handle and password don't match. Try again, or reset your password.";
const TOO_MANY = "Too many tries in a row. Wait a minute and try again.";

const email = z.string().trim().toLowerCase().pipe(z.email("That doesn't look like an email address."));

const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(72, "That's a little too long — 72 characters max.")
  .refine((p) => passwordStrength(p) >= 2, "Too easy to guess. Try a longer one.");

function fieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as Field;
    fields[key] ??= issue.message;
  }
  return fields;
}

const isRateLimit = (error: AuthError) => error.status === 429 || /rate limit/i.test(error.message);

/** Signing in ends "view as visitor" mode on your own profile. */
async function clearPreview() {
  (await cookies()).delete(PREVIEW_AS_VISITOR_COOKIE);
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  await clearPreview();
  redirect("/");
}

/* ------------------------------------------------------------------ sign in */

const signInSchema = z.object({
  login: z.string().trim().min(1, "Enter your email or handle."),
  password: z.string().min(1, "Enter your password."),
});

/** "you@x.com" is an email; "@nova" or "nova" is a handle, looked up privately. */
async function emailForLogin(login: string) {
  if (/^[^@]+@[^@]+$/.test(login)) return login.toLowerCase();
  const handle = normalizeHandleInput(login);
  if (handleProblem(handle)) return null;
  const { data: profile } = await createSupabasePublic().from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!profile) return null;
  const { data } = await createSupabaseAdmin().auth.admin.getUserById(profile.id);
  return data.user?.email ?? null;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({ login: formData.get("login"), password: formData.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const address = await emailForLogin(parsed.data.login);
  if (!address) return { error: WRONG_LOGIN };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: address, password: parsed.data.password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email first: open the link we sent when you signed up." };
    }
    return { error: isRateLimit(error) ? TOO_MANY : WRONG_LOGIN };
  }

  await clearPreview();
  const next = safeNext(formData.get("next"));
  // An account that never picked a handle finishes onboarding first.
  if (!(await fetchHandleForUser(data.user.id))) redirect(`/join/handle?next=${encodeURIComponent(next)}`);
  redirect(next);
}

/** Social sign-in, for the providers switched on in Supabase. */
export async function continueWithProvider(formData: FormData) {
  const provider = (await enabledProviders()).find((p) => p === formData.get("provider"));
  if (!provider) return;

  const next = safeNext(formData.get("next"));
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/sign-in?error=provider");
  redirect(data.url);
}

export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/new-password`,
  });
  // Same answer whether or not the account exists.
  if (error && isRateLimit(error)) return { error: "We just sent one. Give it a few minutes, then try again." };
  return { sent: parsed.data };
}

export async function setNewPassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return { fields: { password: parsed.error.issues[0].message } };

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "This reset link has expired. Ask for a new one from the sign-in page." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return error.code === "same_password"
      ? { fields: { password: "That's your current password. Pick a new one." } }
      : { error: "Couldn't save your new password. Try again in a moment." };
  }
  redirect("/");
}

/* ------------------------------------------------------------------ sign up */

async function isTaken(handle: string) {
  return isReservedHandle(handle) || db.profiles.some((p) => p.handle === handle) || (await isHandleRegistered(handle));
}

async function suggestionsFor(handle: string) {
  const base = handle.replace(/[._\d]+$/, "") || handle;
  const candidates = [`${base}draws`, `${base}.art`, `${base}_studio`, `the${base}`, `${base}ink`].filter(
    (h) => h !== handle && !handleProblem(h),
  );
  const free = await Promise.all(candidates.map(async (h) => ((await isTaken(h)) ? null : h)));
  return free.filter((h): h is string => h !== null).slice(0, 3);
}

export async function checkHandle(raw: string): Promise<HandleCheck> {
  const handle = normalizeHandleInput(String(raw).slice(0, 64));
  const problem = handleProblem(handle);
  if (problem) return { handle, status: "invalid", message: problem };
  if (await isTaken(handle)) return { handle, status: "taken", suggestions: await suggestionsFor(handle) };
  return { handle, status: "available" };
}

export async function checkInvite(raw: string): Promise<InviteCheck> {
  const found = await lookupInvite(String(raw).slice(0, 32));
  return found.ok ? found : { ok: false, error: INVITE_ERRORS[found.reason] };
}

/** An optional typed code: null when blank, else the invite or why it can't be used. */
async function resolveInvite(code: string | undefined) {
  if (!code) return { invite: null };
  const found = await lookupInvite(code);
  return found.ok ? { invite: found.invite } : { invite: null, error: INVITE_ERRORS[found.reason] };
}

const handleField = z
  .string()
  .transform(normalizeHandleInput)
  .superRefine((handle, ctx) => {
    const problem = handleProblem(handle);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });
const termsField = z.literal("on", { error: "Please accept the terms to continue." });
const inviteField = z.string().trim().max(32).optional();

const signUpSchema = z.object({ handle: handleField, email, password, terms: termsField, invite: inviteField });

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    handle: formData.get("handle") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms"),
    invite: formData.get("invite") || undefined,
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };

  const { handle, invite: code } = parsed.data;
  if (await isTaken(handle)) return { ok: false, fields: { handle: "That handle is taken." } };
  const { invite, error: inviteError } = await resolveInvite(code);
  if (inviteError) return { ok: false, fields: { invite: inviteError } };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the `handle_new_user` trigger, which creates the profile.
      data: { handle, display_name: handle, invite_code: invite?.code ?? null },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/${handle}`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { ok: false, fields: { password: "Too easy to guess. Try a longer one." } };
    if (error.code === "email_address_invalid") {
      return { ok: false, fields: { email: "We can't send email to that address. Check it, or use another one." } };
    }
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { ok: false, fields: { email: "There's already an account with that email. Sign in instead?" } };
    }
    // Supabase's built-in mailer only reaches the project team until our own sender (Resend) is set up.
    if (error.code === "email_address_not_authorized") {
      return { ok: false, error: "We can't email that address yet: sign-ups open once our mail service is live.", fields: {} };
    }
    if (isRateLimit(error)) {
      return { ok: false, error: "We can't send more emails right now. Try again in a few minutes.", fields: {} };
    }
    // The trigger failed: someone took the handle a moment ago.
    if (/database error/i.test(error.message)) return { ok: false, fields: { handle: "That handle was just taken." } };
    return { ok: false, error: "Couldn't create your account. Try again in a moment.", fields: {} };
  }

  updateTag(profileTag(handle));
  if (data.session) await clearPreview();
  return {
    ok: true,
    handle,
    email: parsed.data.email,
    inviter: invite?.inviter.handle,
    // With email confirmation on, the account starts signed out until the link is opened.
    confirmEmail: !data.session,
  };
}

/* --------------------------------------------------------------- onboarding */

const claimSchema = z.object({ handle: handleField, terms: termsField, invite: inviteField });

/**
 * Social sign-ups arrive without a handle: they pick one here, and the
 * server creates their profile (`claim_profile`, secret key only) for the
 * user it has just verified from the session.
 */
export async function claimHandle(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse({
    handle: formData.get("handle") ?? "",
    terms: formData.get("terms"),
    invite: formData.get("invite") || undefined,
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/sign-in?next=/join/handle");
  const existing = await fetchHandleForUser(claims.sub);
  if (existing) redirect(`/${existing}`);

  const { handle, invite: code } = parsed.data;
  if (await isTaken(handle)) return { fields: { handle: "That handle is taken." } };
  const { invite, error: inviteError } = await resolveInvite(code);
  if (inviteError) return { fields: { invite: inviteError } };

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const display = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const { error } = await createSupabaseAdmin().rpc("claim_profile", {
    uid: claims.sub,
    wanted: handle,
    display: display?.slice(0, 50) ?? handle,
    typed_code: invite?.code ?? null,
  });
  if (error) {
    // 23505: unique violation, someone took the handle a moment ago.
    if (error.code === "23505") return { fields: { handle: "That handle was just taken." } };
    return { error: "Couldn't save your handle. Try again in a moment.", fields: {} };
  }

  updateTag(userTag(claims.sub));
  updateTag(profileTag(handle));
  // Straight to their new page, unless they were headed somewhere specific.
  const next = safeNext(formData.get("next"), "/");
  redirect(next === "/" ? `/${handle}` : next);
}

