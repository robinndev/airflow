"use client";

import { ArrowLeft, ArrowRight, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState, type ReactNode } from "react";
import { requestPasswordReset, signIn } from "@/app/(auth)/actions";
import { FieldError, FormAlert, PasswordField, SubmitButton, fieldClass, labelClass } from "./form-ui";

/**
 * Email + password, with "forgot it?" swapping the sheet to a reset form in
 * place. `header` (heading + provider buttons) is rendered by the server and
 * hidden while resetting.
 */
export function SignInForm({ header, next }: { header: ReactNode; next?: string }) {
  const id = useId();
  const [state, action, pending] = useActionState(signIn, null);
  const [mode, setMode] = useState<"sign-in" | "reset">("sign-in");
  // Controlled, so a failed attempt keeps what was typed.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Re-keys the error so it shakes on every failed attempt, not just the first.
  const [attempt, setAttempt] = useState(0);

  if (mode === "reset") {
    return <ResetPassword email={email} onEmailChange={setEmail} onBack={() => setMode("sign-in")} />;
  }

  return (
    <>
      {header}
      <form action={action} onSubmit={() => setAttempt((n) => n + 1)} noValidate className="animate-rise">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.art"
            aria-invalid={state?.fields?.email ? true : undefined}
            aria-describedby={state?.fields?.email ? `${id}-email-error` : undefined}
            className={`${fieldClass} mt-2`}
          />
          <FieldError id={`${id}-email-error`}>{state?.fields?.email}</FieldError>
        </div>

        <div className="mt-5">
          <PasswordField
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={state?.fields?.password}
            aside={
              <button
                type="button"
                onClick={() => setMode("reset")}
                className="text-sm font-semibold text-ocean-ink hover:underline"
              >
                Forgot it?
              </button>
            }
          />
        </div>

        {state?.error && <FormAlert key={attempt}>{state.error}</FormAlert>}

        <SubmitButton pending={pending} pendingLabel="Opening the door…">
          Enter the studio
          <ArrowRight aria-hidden />
        </SubmitButton>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/join" className="font-semibold text-ocean-ink hover:underline">
            Start a fresh page
          </Link>
        </p>
      </form>
    </>
  );
}

function ResetPassword({
  email,
  onEmailChange,
  onBack,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onBack: () => void;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <div className="animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-sm font-semibold text-muted transition-colors hover:bg-ice hover:text-ink [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden />
        Back to sign in
      </button>

      {state && "sent" in state ? (
        <div role="status" className="mt-8 text-center">
          <span className="mx-auto grid size-16 animate-stamp place-items-center rounded-full bg-mint/15 text-mint-ink">
            <MailCheck aria-hidden className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">Check your inbox</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            If <span className="font-semibold text-ink">{state.sent}</span> has an account, a reset link is on its
            way. It works for the next hour.
          </p>
          <p className="mt-6 font-hand text-xl text-lilac-ink">no rush, the studio isn&apos;t going anywhere ✦</p>
        </div>
      ) : (
        <>
          <h1 className="mt-6 font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Lost your key?
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
            Tell us your email and we&apos;ll send you a link to set a new password.
          </p>
          <form action={action} noValidate className="mt-7">
            <label htmlFor={`${id}-email`} className={labelClass}>
              Email
            </label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@studio.art"
              aria-invalid={state && "error" in state ? true : undefined}
              aria-describedby={state && "error" in state ? `${id}-error` : undefined}
              className={`${fieldClass} mt-2`}
            />
            <FieldError id={`${id}-error`}>{state && "error" in state ? state.error : undefined}</FieldError>
            <SubmitButton pending={pending} pendingLabel="Sending…">
              Send me a link
              <Send aria-hidden />
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
