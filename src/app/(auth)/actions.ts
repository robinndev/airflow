"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { handleProblem, isReservedHandle, normalizeHandleInput } from "@/lib/auth/handles";
import { findInvite, type Invite } from "@/lib/auth/invites";
import { PASSWORD_MIN, passwordStrength } from "@/lib/auth/password";
import { db } from "@/lib/profile/mock-db";
import { PREVIEW_AS_VISITOR_COOKIE, SIGNED_OUT_COOKIE } from "@/lib/session";

/*
 * Mock auth until a provider is chosen. Nothing is stored: a well-formed
 * sign-in signs you in as the demo artist, and sign-up runs every real check
 * (handle availability, password, invite code) before "creating" the account.
 */

type Field = "email" | "password" | "handle" | "terms" | "invite";
export type FieldErrors = Partial<Record<Field, string>>;

export type SignInState = { error?: string; fields?: FieldErrors } | null;
export type ResetState = { sent: string } | { error: string } | null;
export type SignUpState =
  | { ok: true; handle: string; email: string; inviter?: string }
  | { ok: false; error?: string; fields: FieldErrors }
  | null;

export type HandleCheck =
  | { handle: string; status: "available" }
  | { handle: string; status: "taken"; suggestions: string[] }
  | { handle: string; status: "invalid"; message: string };

export type InviteCheck = { ok: true; invite: Invite } | { ok: false; error: string };

const email = z.string().trim().toLowerCase().pipe(z.email("That doesn't look like an email address."));

function fieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as Field;
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Only same-site paths, so `?next=` can't bounce anyone to another site. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/";
}

async function startSession() {
  const store = await cookies();
  store.delete(SIGNED_OUT_COOKIE);
  store.delete(PREVIEW_AS_VISITOR_COOKIE);
}

export async function signOut() {
  const store = await cookies();
  store.set(SIGNED_OUT_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/sign-in");
}

/* ------------------------------------------------------------------ sign in */

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  // No accounts exist yet; anything shorter than a valid password can't match one.
  if (parsed.data.password.length < PASSWORD_MIN) {
    return { error: "That email and password don't match. Try again, or reset your password." };
  }
  await startSession();
  redirect(safeNext(formData.get("next")));
}

export async function continueWithProvider(formData: FormData) {
  const provider = formData.get("provider");
  if (provider !== "google" && provider !== "discord") return;
  await startSession();
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return { sent: parsed.data };
}

/* ------------------------------------------------------------------ sign up */

function isTaken(handle: string) {
  return isReservedHandle(handle) || db.profiles.some((p) => p.handle === handle);
}

function suggestionsFor(handle: string) {
  const base = handle.replace(/[._\d]+$/, "") || handle;
  return [`${base}draws`, `${base}.art`, `${base}_studio`, `the${base}`, `${base}ink`]
    .filter((h) => h !== handle && !handleProblem(h) && !isTaken(h))
    .slice(0, 3);
}

export async function checkHandle(raw: string): Promise<HandleCheck> {
  const handle = normalizeHandleInput(String(raw).slice(0, 64));
  const problem = handleProblem(handle);
  if (problem) return { handle, status: "invalid", message: problem };
  if (isTaken(handle)) return { handle, status: "taken", suggestions: suggestionsFor(handle) };
  return { handle, status: "available" };
}

export async function checkInvite(raw: string): Promise<InviteCheck> {
  const invite = await findInvite(String(raw).slice(0, 32));
  return invite
    ? { ok: true, invite }
    : { ok: false, error: "That code doesn't match any invite. Double-check it with the artist who sent it." };
}

const signUpSchema = z.object({
  handle: z
    .string()
    .transform(normalizeHandleInput)
    .superRefine((handle, ctx) => {
      const problem = handleProblem(handle);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
      else if (isTaken(handle)) ctx.addIssue({ code: "custom", message: "That handle is taken." });
    }),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(128, "That's a little too long — 128 characters max.")
    .refine((p) => passwordStrength(p) >= 2, "Too easy to guess. Try a longer one."),
  terms: z.literal("on", { error: "Please accept the terms to continue." }),
  invite: z.string().trim().max(32).optional(),
});

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
  const invite = code ? await findInvite(code) : null;
  if (code && !invite) {
    return { ok: false, fields: { invite: "That invite code doesn't match any artist." } };
  }

  await startSession();
  return { ok: true, handle, email: parsed.data.email, inviter: invite?.inviter.handle };
}
