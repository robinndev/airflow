import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SheetHeading } from "@/components/auth/auth-sheet";
import { ClaimHandleForm } from "@/components/auth/claim-handle-form";
import { getSignedInIdentity, handleCandidate } from "@/lib/auth/identity";
import { INVITE_ERRORS, lookupInvite } from "@/lib/auth/invites";
import { safeNext } from "@/lib/auth/redirects";
import { fetchHandleForUser } from "@/lib/profile/accounts";

export const metadata: Metadata = { title: "Pick your handle" };

/**
 * Onboarding for social sign-ups (Google, Discord, Twitch): they're signed
 * in but have no profile yet. Shows who they connected as and starts the
 * handle from their username there.
 */
export default function ClaimHandlePage({ searchParams }: PageProps<"/join/handle">) {
  return (
    <>
      <SheetHeading lead="Last step: pick your" hand="signature.">
        Your handle is your link on Artiflow and how you sign your work.
      </SheetHeading>
      <Suspense fallback={<div aria-hidden className="mt-8 h-72 animate-pulse rounded-card bg-ice/60" />}>
        <Claim searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Claim({ searchParams }: Pick<PageProps<"/join/handle">, "searchParams">) {
  const { next, invite } = await searchParams;
  const identity = await getSignedInIdentity();
  if (!identity) redirect("/sign-in?next=/join/handle");
  const existing = await fetchHandleForUser(identity.id);
  if (existing) redirect(`/${existing}`);

  const code = typeof invite === "string" ? invite.slice(0, 32) : "";
  const found = code ? await lookupInvite(code) : null;
  return (
    <ClaimHandleForm
      connectedAs={{
        provider: identity.provider,
        label: identity.username ? `@${identity.username}` : (identity.displayName ?? identity.email ?? ""),
      }}
      suggestedHandle={handleCandidate(identity)}
      next={safeNext(next)}
      invite={found && { code, found: found.ok ? found.invite : null, error: found.ok ? undefined : INVITE_ERRORS[found.reason] }}
    />
  );
}
