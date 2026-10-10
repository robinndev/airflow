import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderButtons, SheetHeading } from "@/components/auth/auth-sheet";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { INVITE_ERRORS, lookupInvite } from "@/lib/auth/invites";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Your portfolio, OCs and commissions, signed with your name.",
};

const header = (
  <>
    <SheetHeading lead="Start on a blank" hand="canvas.">
      Your portfolio, OCs and commissions, all signed with your name.
    </SheetHeading>
    <ProviderButtons verb="Sign up" />
  </>
);

/** Invite links (`/join?invite=CODE`) open with the envelope already checked. */
export default function JoinPage({ searchParams }: PageProps<"/join">) {
  return (
    <Suspense fallback={<SignUpForm header={header} />}>
      <SignUpWithInvite searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpWithInvite({ searchParams }: Pick<PageProps<"/join">, "searchParams">) {
  const { invite } = await searchParams;
  const code = typeof invite === "string" ? invite.slice(0, 32) : "";
  const found = code ? await lookupInvite(code) : null;
  return (
    <SignUpForm
      header={header}
      invite={found && { code, found: found.ok ? found.invite : null, error: found.ok ? undefined : INVITE_ERRORS[found.reason] }}
    />
  );
}
