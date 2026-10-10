import type { Metadata } from "next";
import { Suspense } from "react";
import { OrDivider, ProviderButtons, SheetHeading } from "@/components/auth/auth-sheet";
import { SignInForm } from "@/components/auth/sign-in-form";

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
    <OrDivider />
  </>
);

/** The shell (and a working form) prerenders; only `?next=` waits for the request. */
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={<SignInForm header={header} />}>
      <SignInWithNext searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInWithNext({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { next } = await searchParams;
  return <SignInForm header={header} next={typeof next === "string" ? next : undefined} />;
}
