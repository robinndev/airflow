"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { checkHandle, type HandleCheck } from "@/app/(auth)/actions";
import { HANDLE_MAX, handleProblem, normalizeHandleInput } from "@/lib/auth/handles";
import { labelClass } from "./form-ui";

/**
 * artiflow.com/<handle>, checked as you type: shape rules locally, then
 * availability on the server (debounced, stale answers ignored). Taken
 * handles come with one-tap suggestions.
 */
export function HandleField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (handle: string) => void;
  error?: string;
}) {
  const id = useId();
  const problem = value ? handleProblem(value) : null;
  const [remote, setRemote] = useState<HandleCheck | null>(null);

  useEffect(() => {
    if (!value || problem) return;
    let current = true;
    const timer = window.setTimeout(() => {
      checkHandle(value).then((result) => current && setRemote(result));
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [value, problem]);

  const result = remote?.handle === value ? remote : null;
  const checking = Boolean(value) && !problem && !result;
  // Too short is still "typing", not wrong — only say it in red once it matters.
  const invalid = Boolean(error) || result?.status === "taken" || (problem !== null && value.length >= 3);

  let status: React.ReactNode = "Your link and your signature: a–z, 0–9, dots and _.";
  let tone = "text-muted";
  if (error) [status, tone] = [error, "text-danger"];
  else if (problem) [status, tone] = [problem, value.length >= 3 ? "text-danger" : "text-muted"];
  else if (checking) status = "Checking the shelves…";
  else if (result?.status === "available") [status, tone] = [<>artiflow.com/{value} is all yours ✦</>, "text-mint-ink"];
  else if (result?.status === "taken") {
    tone = "text-danger";
    status = (
      <>
        @{value} is taken.
        {result.suggestions.length > 0 && (
          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-muted">
            Try
            {result.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onChange(suggestion)}
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-semibold text-ink transition-colors hover:border-ocean/50 hover:bg-ice"
              >
                {suggestion}
              </button>
            ))}
          </span>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          Your handle
        </label>
        <span aria-hidden className="font-hand text-lg leading-none text-lilac-ink">
          sign your work
        </span>
      </div>
      <div
        className={`mt-2 flex h-12 items-center rounded-input border bg-surface transition-[border-color,box-shadow] duration-150 focus-within:ring-4 ${
          invalid
            ? "border-danger focus-within:ring-danger/12"
            : "border-border focus-within:border-ocean focus-within:ring-ocean/12"
        }`}
      >
        <span aria-hidden className="pl-3.5 text-[0.9375rem] text-muted select-none">
          artiflow.com/
        </span>
        <input
          id={id}
          name="handle"
          value={value}
          onChange={(e) => onChange(normalizeHandleInput(e.target.value).replace(/\s+/g, ""))}
          maxLength={HANDLE_MAX + 1}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname"
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-status`}
          className="h-full min-w-0 flex-1 bg-transparent pr-2 text-[0.9375rem] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/60"
        />
        <span aria-hidden className="grid w-10 shrink-0 place-items-center [&_svg]:size-4">
          {checking && <LoaderCircle className="animate-spin text-muted" />}
          {!checking && result?.status === "available" && !error && (
            <span className="grid size-5 animate-stamp place-items-center rounded-full bg-mint/20 text-mint-ink [&_svg]:size-3">
              <Check strokeWidth={3} />
            </span>
          )}
          {!checking && invalid && <X className="text-danger" />}
        </span>
      </div>
      <p id={`${id}-status`} aria-live="polite" className={`mt-1.5 text-xs font-medium ${tone}`}>
        {status}
      </p>
    </div>
  );
}
