"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { setNewPassword } from "@/app/(auth)/actions";
import { FormAlert, PasswordField, SubmitButton } from "./form-ui";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, null);
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);

  return (
    <form action={action} onSubmit={() => setAttempt((n) => n + 1)} noValidate className="mt-8 animate-rise">
      <PasswordField meter autoComplete="new-password" value={password} onChange={setPassword} error={state?.fields?.password} />
      {state?.error && (
        <FormAlert key={attempt}>
          {state.error}{" "}
          <Link href="/sign-in" className="font-semibold underline">
            Go to sign in
          </Link>
        </FormAlert>
      )}
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
        <KeyRound aria-hidden />
      </SubmitButton>
    </form>
  );
}
