"use client";

import { CircleCheck } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { changePassword, sendPasswordReset, type FormState } from "@/app/(site)/settings/actions";
import { PasswordField } from "@/components/auth/form-ui";
import { buttonClasses } from "@/components/ui/button";
import { SheetRow } from "./sheet";

/**
 * Changing your password (asks for the current one first), or setting a
 * first one when you joined with Google, Discord or Twitch.
 */
export function PasswordSetting({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, saving] = useActionState<FormState, FormData>(changePassword, null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [reset, setReset] = useState<"idle" | "sent" | string>("idle");
  const [sending, startSending] = useTransition();
  const fields = state && !state.ok ? state.fields : undefined;

  function forgot() {
    startSending(async () => {
      const result = await sendPasswordReset();
      setReset(result.ok ? "sent" : result.error);
    });
  }

  return (
    <>
      <SheetRow
        label="Password"
        action={
          !open &&
          !state?.ok && (
            <button type="button" onClick={() => setOpen(true)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {hasPassword ? "Change" : "Set a password"}
            </button>
          )
        }
      >
        {hasPassword ? (
          <>
            <span aria-hidden>••••••••••</span>
            <span className="sr-only">Set</span>
          </>
        ) : (
          "Not set. You sign in with a connected account; a password lets you sign in with your email or handle too."
        )}
      </SheetRow>

      {state?.ok && (
        <p role="status" className="mb-2 flex items-start gap-2 rounded-input bg-mint/12 px-3.5 py-3 text-sm text-ink">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-mint-ink dark:text-mint" />
          {state.message}
        </p>
      )}

      {open && !state?.ok && (
        <form action={action} className="mb-2 grid gap-4 rounded-card border border-border bg-canvas/40 p-4">
          {hasPassword && (
            <PasswordField
              label="Current password"
              name="current"
              autoComplete="current-password"
              value={current}
              onChange={setCurrent}
              error={fields?.current}
              aside={
                reset === "sent" ? (
                  <span className="text-xs font-semibold text-mint-ink dark:text-mint">Reset link sent to your email</span>
                ) : (
                  <button
                    type="button"
                    onClick={forgot}
                    disabled={sending}
                    className="text-xs font-semibold text-ocean-ink hover:underline disabled:opacity-60 dark:text-ocean"
                  >
                    {sending ? "Sending…" : "Forgot it?"}
                  </button>
                )
              }
            />
          )}
          {reset !== "idle" && reset !== "sent" && (
            <p role="alert" className="-mt-2 text-sm text-danger">
              {reset}
            </p>
          )}
          <PasswordField label="New password" name="password" autoComplete="new-password" value={next} onChange={setNext} error={fields?.password} meter />
          {state && !state.ok && state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className={buttonClasses({ size: "sm" })}>
              {saving ? "Saving…" : hasPassword ? "Change password" : "Set password"}
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
