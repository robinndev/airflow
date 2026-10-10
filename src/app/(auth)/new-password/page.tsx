import type { Metadata } from "next";
import { SheetHeading } from "@/components/auth/auth-sheet";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Set a new password" };

/** Reached from the reset email (via /auth/confirm, which signs you in for this). */
export default function NewPasswordPage() {
  return (
    <>
      <SheetHeading lead="Pick a new" hand="key.">
        Choose a new password for your studio. You&apos;ll stay signed in.
      </SheetHeading>
      <NewPasswordForm />
    </>
  );
}
