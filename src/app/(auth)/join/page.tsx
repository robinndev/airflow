import type { Metadata } from "next";
import { Suspense } from "react";
import { OrDivider, ProviderButtons, SheetHeading } from "@/components/auth/auth-sheet";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { findInvite } from "@/lib/auth/invites";

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
    <OrDivider />
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
  const found = code ? await findInvite(code) : null;
  return <SignUpForm header={header} invite={code ? { code, found } : undefined} />;
}
