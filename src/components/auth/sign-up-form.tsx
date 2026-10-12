"use client";

import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { signUp } from "@/app/(auth)/actions";
import { Stamp } from "@/components/explore/stamp";
import { DrawsPicker } from "@/components/profile/draws-picker";
import type { Invite } from "@/lib/auth/invites";
import type { DrawTag } from "@/lib/profile/draws";
import { resetDesk, setDesk } from "./desk";
import { FieldError, FormAlert, PasswordField, SubmitButton, TermsCheckbox, fieldClass, labelClass } from "./form-ui";
import { HandleField } from "./handle-field";
import { InviteEnvelope } from "./invite-envelope";

type SignUpFormProps = {
  /** Heading + provider buttons, rendered by the server; hidden once the account exists. */
  header: ReactNode;
  /** From an invite link (`/join?invite=CODE`), already looked up. */
  invite?: { code: string; found: Invite | null; error?: string } | null;
};

export function SignUpForm({ header, invite }: SignUpFormProps) {
  const id = useId();
  const [state, action, pending] = useActionState(signUp, null);
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [draws, setDraws] = useState<DrawTag[]>([]);
  const [attempt, setAttempt] = useState(0);
  const fields = state && !state.ok ? state.fields : {};

  // The canvas on the desk mirrors this form; leave it clean for next time.
  useEffect(() => resetDesk, []);
  useEffect(() => {
    if (state?.ok) setDesk({ signed: true });
  }, [state]);

  if (state?.ok) return <Welcome {...state} />;

  return (
    <>
      {header}
      <form action={action} onSubmit={() => setAttempt((n) => n + 1)} noValidate className="animate-rise">
        <HandleField
          value={handle}
          onChange={(value) => {
            setHandle(value);
            setDesk({ handle: value });
          }}
          error={fields.handle}
        />

        <div className="mt-5">
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
            aria-invalid={fields.email ? true : undefined}
            aria-describedby={fields.email ? `${id}-email-error` : undefined}
            className={`${fieldClass} mt-2`}
          />
          <FieldError id={`${id}-email-error`}>{fields.email}</FieldError>
        </div>

        <div className="mt-5">
          <PasswordField
            meter
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={fields.password}
          />
        </div>

        <div className="mt-6">
          <p id={`${id}-draws`} className={labelClass}>
            What do you draw?
          </p>
          <p className="mt-1 mb-3 text-xs text-muted">
            Pick any, or all. Buyers find artists by it. Only here to commission? Skip it.
          </p>
          <DrawsPicker value={draws} onChange={setDraws} name="draws" labelledBy={`${id}-draws`} />
        </div>

        <InviteEnvelope initialCode={invite?.code} initialInvite={invite?.found} initialError={invite?.error} error={fields.invite} />

        <TermsCheckbox checked={terms} onChange={setTerms} error={fields.terms} />

        {state && !state.ok && state.error && <FormAlert key={attempt}>{state.error}</FormAlert>}

        <SubmitButton pending={pending} pendingLabel="Stretching your canvas…">
          Open my studio
          <Sparkles aria-hidden />
        </SubmitButton>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-ocean-ink hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}

// Paint flicked off the brush when the account is made (see the `splat` keyframes).
const DROPS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.2;
  const reach = 70 + ((i * 37) % 60);
  return {
    dx: `${Math.round(Math.cos(angle) * reach * 1.5)}px`,
    dy: `${Math.round(Math.sin(angle) * reach)}px`,
    size: 7 + ((i * 5) % 9),
    color: ["var(--ocean)", "var(--mint)", "var(--lilac)", "var(--sky)", "var(--like)"][i % 5],
    delay: `${(i % 4) * 40}ms`,
  };
});

/**
 * After sign-up. With email confirmation on (the default), the account
 * starts signed out until the link is opened, so we point to the inbox;
 * otherwise straight to the new page.
 */
function Welcome({
  handle,
  email,
  inviter,
  confirmEmail,
}: {
  handle: string;
  email: string;
  inviter?: string;
  confirmEmail: boolean;
}) {
  return (
    <div role="status" className="relative py-4 text-center">
      <span aria-hidden className="pointer-events-none absolute top-24 left-1/2">
        {DROPS.map((drop, i) => (
          <span
            key={i}
            className="absolute block animate-splat rounded-full"
            style={
              {
                width: drop.size,
                height: drop.size,
                backgroundColor: drop.color,
                "--dx": drop.dx,
                "--dy": drop.dy,
                animationDelay: drop.delay,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <Stamp tone="mint" className="animate-stamp text-xs">
        Account created
      </Stamp>
      <h1 className="mt-6 font-display text-[2.125rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
        {confirmEmail ? "One last stroke," : "Your page is ready,"}
        <span className="mt-1 block truncate font-hand text-[1.4em] leading-[1.05] font-bold tracking-normal text-ocean">
          @{handle}
        </span>
      </h1>
      {confirmEmail ? (
        <p className="mx-auto mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-muted">
          <MailCheck aria-hidden className="mr-1.5 inline size-4 align-[-2px] text-mint-ink" />
          Open the link we sent to <span className="font-semibold break-all text-ink">{email}</span> to confirm
          it&apos;s you. Your page goes live right after.
        </p>
      ) : (
        <p className="mx-auto mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-muted">
          You&apos;re signed in. Add your art, open commissions, make it yours.
        </p>
      )}
      {inviter && <p className="mt-4 font-hand text-xl text-lilac-ink">invited by @{inviter} ♥</p>}
      {confirmEmail ? (
        <Link href="/explore" className="mt-8 inline-flex text-sm font-semibold text-ocean-ink hover:underline">
          Look around while you wait
        </Link>
      ) : (
        <Link
          href={`/${handle}`}
          className="group/enter mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-ocean text-base font-semibold text-white shadow-[0_10px_24px_-12px_var(--ocean)] transition-[filter,translate] hover:-translate-y-px hover:brightness-105"
        >
          Go to your page
          <ArrowRight aria-hidden className="size-[1.125rem] transition-transform group-hover/enter:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
