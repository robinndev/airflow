"use client";

import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { STRENGTH_STAGES, passwordStrength } from "@/lib/auth/password";

export const fieldClass =
  "h-12 w-full rounded-input border border-border bg-surface px-3.5 text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/60 focus:border-ocean focus:ring-4 focus:ring-ocean/12 aria-invalid:border-danger aria-invalid:focus:ring-danger/12";

export const labelClass = "block text-sm font-semibold text-ink";

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger">
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** A form-level problem. Re-key it per attempt so it shakes every time. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-5 flex animate-shake items-start gap-2 rounded-input bg-danger/8 px-3.5 py-3 text-sm text-danger">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

/** The big primary action, with a sheen of paint sweeping across on hover. */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group/submit relative mt-7 flex h-12 w-full items-center justify-center overflow-hidden rounded-button bg-ocean text-base font-semibold text-white shadow-[0_10px_24px_-12px_var(--ocean)] transition-[filter,translate] duration-150 hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:cursor-progress disabled:opacity-80"
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_25%,color-mix(in_oklab,var(--mint)_50%,transparent)_45%,color-mix(in_oklab,var(--lilac)_40%,transparent)_55%,transparent_75%)] transition-transform duration-700 ease-out group-hover/submit:translate-x-full motion-reduce:hidden"
      />
      <span className="relative flex items-center gap-2 [&_svg]:size-[1.125rem]">
        {pending ? (
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

type PasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Right side of the label row (e.g. "Forgot it?"). */
  aside?: ReactNode;
  /** Sign-up: show the strength stroke. */
  meter?: boolean;
};

export function PasswordField({ autoComplete, value, onChange, error, aside, meter = false }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-error`, meter && `${id}-meter`].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          Password
        </label>
        {aside}
      </div>
      <div className="relative mt-2">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={meter ? "8+ characters" : "Your password"}
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-[8px] text-muted transition-colors hover:bg-ice hover:text-ink [&_svg]:size-[1.125rem]"
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
      {meter && <StrengthStroke id={`${id}-meter`} password={value} />}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/**
 * Password strength as a brush stroke that paints further the stronger it
 * gets, named after the stages of a drawing (rough sketch → fully rendered).
 */
function StrengthStroke({ id, password }: { id: string; password: string }) {
  const gradient = `${useId().replace(/[^\w-]/g, "")}-paint`;
  const strength = passwordStrength(password);
  return (
    <div id={id} className="mt-2.5 flex items-center gap-3">
      <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="h-3 min-w-0 flex-1 overflow-visible">
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="0" x2="200">
            <stop offset="0" stopColor="var(--sky)" />
            <stop offset=".45" stopColor="var(--mint)" />
            <stop offset=".75" stopColor="var(--lilac)" />
            <stop offset="1" stopColor="var(--ocean)" />
          </linearGradient>
        </defs>
        <path d="M4 7C40 3 76 10 112 6s56-3 84 1" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-border" />
        <path
          d="M4 7C40 3 76 10 112 6s56-3 84 1"
          fill="none"
          stroke={`url(#${gradient})`}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - strength / 4}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
          opacity={strength === 0 ? 0 : 1}
        />
      </svg>
      <span className="w-28 shrink-0 text-right text-xs font-semibold text-muted" aria-live="polite">
        {password ? (
          <>
            <span className="sr-only">Password strength: </span>
            {STRENGTH_STAGES[strength]}
            {strength === 4 && " ✦"}
          </>
        ) : (
          "8+ characters"
        )}
      </span>
    </div>
  );
}
