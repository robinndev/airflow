"use client";

import { Mail, Sparkles } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { claimHandle, signOut } from "@/app/(auth)/actions";
import type { Invite } from "@/lib/auth/invites";
import { PROVIDER_NAMES, type Provider } from "@/lib/auth/providers";
import { resetDesk, setDesk } from "./desk";
import { FormAlert, SubmitButton, TermsCheckbox } from "./form-ui";
import { HandleField } from "./handle-field";
import { InviteEnvelope } from "./invite-envelope";
import { PROVIDER_ICONS } from "./provider-icons";

type ClaimHandleFormProps = {
  connectedAs: { provider: Provider | "email"; label: string };
  /** From their username on the provider; may be empty or already taken (the field says so). */
  suggestedHandle: string;
  next: string;
  invite?: { code: string; found: Invite | null; error?: string } | null;
};

export function ClaimHandleForm({ connectedAs, suggestedHandle, next, invite }: ClaimHandleFormProps) {
  const [state, action, pending] = useActionState(claimHandle, null);
  const [handle, setHandle] = useState(suggestedHandle);
  const [terms, setTerms] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fields = state?.fields ?? {};
  const provider = connectedAs.provider;

  // The canvas on the desk signs itself with the suggested handle right away.
  useEffect(() => {
    setDesk({ handle: suggestedHandle });
    return resetDesk;
  }, [suggestedHandle]);

  return (
    <div className="mt-7 animate-rise">
      <p className="flex items-center gap-2.5 rounded-full bg-ice-lilac px-4 py-2.5 text-sm text-ink [&_svg]:size-[1.125rem] [&_svg]:shrink-0 [&_svg]:text-lilac-ink">
        {provider === "email" ? <Mail aria-hidden /> : PROVIDER_ICONS[provider]}
        <span className="min-w-0 truncate">
          Connected {provider === "email" ? "with" : `to ${PROVIDER_NAMES[provider]} as`}{" "}
          <span className="font-semibold">{connectedAs.label}</span>
        </span>
      </p>

      <form action={action} onSubmit={() => setAttempt((n) => n + 1)} noValidate className="mt-6">
        <input type="hidden" name="next" value={next} />
        <HandleField
          value={handle}
          onChange={(value) => {
            setHandle(value);
            setDesk({ handle: value });
          }}
          error={fields.handle}
        />
        <InviteEnvelope initialCode={invite?.code} initialInvite={invite?.found} initialError={invite?.error} error={fields.invite} />
        <TermsCheckbox checked={terms} onChange={setTerms} error={fields.terms} />

        {state?.error && <FormAlert key={attempt}>{state.error}</FormAlert>}

        <SubmitButton pending={pending} pendingLabel="Stretching your canvas…">
          Open my studio
          <Sparkles aria-hidden />
        </SubmitButton>
      </form>

      <form action={signOut} className="mt-5 text-center text-sm text-muted">
        Not you?{" "}
        <button type="submit" className="font-semibold text-ocean-ink hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
