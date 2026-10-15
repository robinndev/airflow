"use client";

import { Lock } from "lucide-react";
import { useId, type ReactNode } from "react";

/** An on/off switch: a pill with a paint dot that slides across. */
export function Switch({
  checked,
  onChange,
  disabled = false,
  labelledBy,
  describedBy,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group/switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-muted/35 p-0.5 transition-colors duration-200 hover:bg-muted/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:cursor-not-allowed disabled:opacity-60 aria-checked:bg-[linear-gradient(110deg,var(--sky),var(--ocean))] aria-checked:hover:brightness-105"
    >
      <span
        aria-hidden
        className="block size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.3)] transition-transform duration-200 ease-out group-aria-checked/switch:translate-x-5 motion-reduce:transition-none"
      />
    </button>
  );
}

/** A setting line: what it is, a hint, and its switch. `locked` shows an always-on line instead. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  locked,
  children,
}: {
  label: string;
  hint?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  locked?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[0.9375rem] font-semibold text-ink">
          {label}
        </p>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-sm leading-snug text-muted">
            {hint}
          </p>
        )}
        {children}
      </div>
      {locked ? (
        <span className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-ice px-2.5 text-xs font-semibold text-muted">
          <Lock aria-hidden className="size-3.5" />
          {locked}
        </span>
      ) : (
        <span className="mt-0.5">
          <Switch
            checked={checked ?? false}
            onChange={onChange ?? (() => {})}
            disabled={disabled}
            labelledBy={`${id}-label`}
            describedBy={hint ? `${id}-hint` : undefined}
          />
        </span>
      )}
    </div>
  );
}
