import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderButtons, SheetHeading } from "@/components/auth/auth-sheet";
import { SignInForm, type SignInNotice } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Welcome back to the studio.",
};

const header = (
  <>
    <SheetHeading lead="Welcome back to the" hand="studio.">
      Your sketchbook is right where you left it.
    </SheetHeading>
    <ProviderButtons verb="Sign in" />
  </>
);

/** The shell (and a working form) prerenders; only `?next=` and `?error=` wait for the request. */
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={<SignInForm header={header} />}>
      <SignInWithNext searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInWithNext({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { next, error } = await searchParams;
  const notice: SignInNotice | undefined = error === "link" || error === "provider" ? error : undefined;
  return <SignInForm header={header} next={typeof next === "string" ? next : undefined} notice={notice} />;
}
