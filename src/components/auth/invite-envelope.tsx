"use client";

import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useState, useTransition, type KeyboardEvent } from "react";
import { checkInvite } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import type { Invite } from "@/lib/auth/invites";
import { WaxSeal } from "./desk-props";
import { setDesk } from "./desk";
import { FieldError, fieldClass } from "./form-ui";

/**
 * "Got an artist code?" — a sealed envelope that opens into a code field.
 * Codes are single-use and give artist access, the right to sell (see
 * src/lib/auth/invites.ts and src/lib/artists/). It's optional: without one
 * you join as a collector and can add a code later. A good code reveals whose
 * it is and pins their polaroid on your canvas. Invite links
 * (`/join?invite=CODE`) arrive with the envelope already open and checked.
 */
export function InviteEnvelope({
  initialCode = "",
  initialInvite = null,
  initialError,
  error: serverError,
}: {
  initialCode?: string;
  initialInvite?: Invite | null;
  /** Why the code from an invite link can't be used (unknown or already used). */
  initialError?: string;
  error?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(Boolean(initialCode));
  const [code, setCode] = useState(initialInvite?.code ?? initialCode);
  const [invite, setInvite] = useState<Invite | null>(initialInvite);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [checking, startChecking] = useTransition();

  useEffect(() => {
    setDesk({ invite });
  }, [invite]);

  function check(value = code, quiet = false) {
    if (!value.trim()) return;
    startChecking(async () => {
      const result = await checkInvite(value);
      if (result.ok) {
        setInvite(result.invite);
        setCode(result.invite.code);
        setError(null);
      } else if (!quiet) {
        setError(result.error);
      }
    });
  }

  // Check quietly once a full code is typed; only an explicit check complains.
  useEffect(() => {
    if (invite || code.replace(/[^A-Z0-9]/g, "").length < 7) return;
    const timer = window.setTimeout(() => check(code, true), 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, invite]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter checks the code instead of submitting the whole sign-up form.
    if (event.key === "Enter") {
      event.preventDefault();
      check();
    }
  }

  function close() {
    setOpen(false);
    setCode("");
    setInvite(null);
    setError(null);
  }

  const shownError = error ?? serverError;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="group/env mt-6 flex w-full items-center gap-4 rounded-card border border-dashed border-lilac/40 bg-ice-lilac/40 py-3 pr-4 pl-3 text-left transition-colors hover:border-lilac/70 hover:bg-ice-lilac/80"
      >
        <Envelope open={false} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Got an artist code?</span>
          <span className="mt-0.5 block text-xs text-muted">It lets you sell commissions and adoptables. No code? Join anyway, and add one later.</span>
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted transition-transform group-hover/env:translate-y-0.5" />
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-card border border-lilac/35 bg-ice-lilac/50 p-3 pb-4 sm:p-4">
      <input type="hidden" name="invite" value={invite?.code ?? code} />
      <div className="flex items-start gap-4">
        <Envelope open />
        <div className="min-w-0 flex-1 pt-1">
          <label htmlFor={`${id}-code`} className="block text-sm font-semibold text-ink">
            {invite ? "You're in as an artist!" : "Artist code"}
          </label>
          <p className="mt-0.5 text-xs text-muted">
            {invite ? "Their code checks out: your studio opens when you join." : "From the artist who invited you."}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Remove artist code"
          className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink [&_svg]:size-4"
        >
          <X aria-hidden />
        </button>
      </div>

      {invite ? (
        <InviteCard invite={invite} onChange={() => setInvite(null)} />
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <input
              id={`${id}-code`}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16));
                setError(null);
              }}
              onKeyDown={onKeyDown}
              autoFocus={!initialCode}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="K7QH-3MPA"
              aria-invalid={shownError ? true : undefined}
              aria-describedby={shownError ? `${id}-error` : undefined}
              className={`${fieldClass} font-mono font-semibold tracking-[0.22em] uppercase placeholder:tracking-[0.22em]`}
            />
            <button
              type="button"
              onClick={() => check()}
              disabled={!code || checking}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-button bg-ink px-4 text-sm font-semibold text-on-ink transition-[filter,opacity] hover:brightness-110 disabled:opacity-50 [&_svg]:size-4"
            >
              {checking && <LoaderCircle aria-hidden className="animate-spin" />}
              Check
            </button>
          </div>
          <FieldError id={`${id}-error`}>{shownError}</FieldError>
        </>
      )}
    </div>
  );
}

function InviteCard({ invite, onChange }: { invite: Invite; onChange: () => void }) {
  const { inviter } = invite;
  return (
    <div className="mt-4 animate-rise">
      <div className="flex items-start gap-3.5 rounded-[14px] bg-surface p-3.5 shadow-soft">
        <span className="relative shrink-0">
          <Avatar image={inviter.avatar} size={52} className="size-13" />
          <WaxSeal
            mark={inviter.displayName[0]}
            className="absolute -right-2.5 -bottom-2 size-8 animate-stamp [animation-delay:150ms]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Artist code from</p>
          <p className="truncate font-display font-bold text-ink">
            {inviter.displayName} <span className="font-sans text-sm font-medium text-muted">@{inviter.handle}</span>
          </p>
          {invite.note && <p className="mt-1.5 font-hand text-[1.25rem] leading-[1.1] text-lilac-ink">“{invite.note}”</p>}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Codes work once: this one becomes yours when you join.{" "}
        <button type="button" onClick={onChange} className="font-semibold text-ocean-ink hover:underline">
          Use a different code
        </button>
      </p>
    </div>
  );
}

/** A little envelope: the flap flips up and the letter slides out when it opens. */
export function Envelope({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative mt-1 block h-12 w-[4.5rem] shrink-0">
      <span className="absolute inset-0 z-0 rounded-[5px] bg-[color-mix(in_oklab,var(--paper)_84%,var(--paper-muted))]" />
      <span
        className={`absolute inset-x-1.5 top-1.5 bottom-1 z-[2] flex flex-col gap-1 rounded-[3px] bg-paper p-1.5 shadow-soft transition-transform duration-500 ease-out ${
          open ? "-translate-y-5 delay-200" : ""
        }`}
      >
        <span className="h-0.5 w-3/4 rounded-full bg-paper-muted/30" />
        <span className="h-0.5 w-1/2 rounded-full bg-paper-muted/30" />
        <span className="ml-auto text-[0.5rem] leading-none text-ocean">✦</span>
      </span>
      <span className="absolute inset-0 z-[3] rounded-[5px] bg-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.25)] [clip-path:polygon(0_32%,50%_68%,100%_32%,100%_100%,0_100%)]" />
      <span
        className={`absolute inset-x-0 top-0 h-[66%] origin-top bg-[color-mix(in_oklab,var(--paper)_92%,var(--paper-muted))] transition-transform duration-300 [clip-path:polygon(0_0,100%_0,50%_100%)] ${
          open ? "z-[1] -scale-y-100" : "z-[4]"
        }`}
      />
      {!open && <WaxSeal className="absolute top-[46%] left-1/2 z-[5] size-6 -translate-x-1/2 -translate-y-1/2" />}
      <span className="absolute top-1 right-1 z-[3] h-3.5 w-3 rounded-[1px] bg-lilac/70 outline-1 outline-offset-[-2px] outline-paper outline-dotted" />
    </span>
  );
}
