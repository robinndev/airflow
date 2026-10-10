import "server-only";
import { connection } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { HANDLE_MAX, handleProblem, normalizeHandleInput } from "./handles";
import { PROVIDER_NAMES, type Provider } from "./providers";

/** Who just signed in, as their provider knows them (for onboarding). */
export type SignedInIdentity = {
  id: string;
  provider: Provider | "email";
  /** Their username on the provider ("robinltss"), shown as "Connected as @…". */
  username: string | null;
  displayName: string | null;
  email: string | null;
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export async function getSignedInIdentity(): Promise<SignedInIdentity | null> {
  // Reads the session and the clock: request time only.
  await connection();
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const provider = user.app_metadata?.provider;
  return {
    id: user.id,
    provider: typeof provider === "string" && provider in PROVIDER_NAMES ? (provider as Provider) : "email",
    username: text(meta.user_name) ?? text(meta.preferred_username) ?? text(meta.nickname),
    displayName: text(meta.full_name) ?? text(meta.name) ?? text(meta.custom_claims?.global_name),
    email: user.email ?? null,
  };
}

/** A handle to start from: their provider username, else their name or email, cleaned up. */
export function handleCandidate(identity: SignedInIdentity) {
  const raw = identity.username ?? identity.displayName ?? identity.email?.split("@")[0] ?? "";
  const handle = normalizeHandleInput(raw)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, HANDLE_MAX);
  return handleProblem(handle) ? "" : handle;
}
