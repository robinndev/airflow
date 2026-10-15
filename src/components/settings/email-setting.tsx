"use client";

import { MailCheck } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { changeEmail, type FormState } from "@/app/(site)/settings/actions";
import { FieldError, fieldClass, labelClass } from "@/components/auth/form-ui";
import { buttonClasses } from "@/components/ui/button";
import { MaskedEmail } from "./masked-email";
import { SheetRow } from "./sheet";

/** Your email, and changing it: Supabase sends a link to both addresses, and it changes once both are opened. */
export function EmailSetting({ email, pending }: { email: string; pending: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, saving] = useActionState<FormState, FormData>(changeEmail, null);
  const id = useId();
  const fieldError = state && !state.ok ? state.fields?.email : undefined;
  const waiting = state?.ok ? state.message : pending ? `Waiting on ${pending}: open the links we sent to both addresses to finish.` : null;

  return (
    <>
      <SheetRow
        label="Your email"
        action={
          !open && (
            <button type="button" onClick={() => setOpen(true)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Change
            </button>
          )
        }
      >
        <MaskedEmail email={email} className="-my-1 text-ink/85" />
      </SheetRow>

      {waiting && (
        <p role="status" className="mb-2 flex items-start gap-2 rounded-input bg-ice px-3.5 py-3 text-sm text-ink">
          <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ocean" />
          {waiting}
        </p>
      )}

      {open && !state?.ok && (
        <form action={action} className="mb-2 rounded-card border border-border bg-canvas/40 p-4">
          <label htmlFor={`${id}-email`} className={labelClass}>
            New email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${id}-error` : `${id}-hint`}
            placeholder="you@example.com"
            className={`${fieldClass} mt-2`}
          />
          <FieldError id={`${id}-error`}>{fieldError}</FieldError>
          <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-muted">
            We&apos;ll send a link to your current address and one to the new one. Your email changes once you&apos;ve opened both.
          </p>
          {state && !state.ok && state.error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className={buttonClasses({ size: "sm" })}>
              {saving ? "Sending…" : "Send the links"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
