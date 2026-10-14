"use client";

import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { redeemArtistCode } from "@/app/(site)/artist-actions";
import { Envelope } from "@/components/auth/invite-envelope";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import { ARTIST_UNLOCKS, CODES_PER_NEW_ARTIST, formatCode, WHY_CODES, type ViewerPass } from "@/lib/artists/codes";
import { showArtistWelcome } from "./artist-welcome";

/*
 * Using an artist code after joining. Two sizes of the same paper: the full
 * sheet (on /studio and /codes: what it unlocks, why codes exist, the code
 * stub) and the strip on your own profile, which keeps asking until you're in.
 */

function useRedeem(onDone: (inviter: string | null, pass: ViewerPass | null) => void) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await redeemArtistCode(code).catch(() => null);
      if (!result) return setError("Couldn't reach the studio. Try again in a moment.");
      if (!result.ok) {
        if (result.signIn) return router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return setError(result.error);
      }
      onDone(result.inviter, result.pass);
      if (result.pass) showArtistWelcome(result.pass, CODES_PER_NEW_ARTIST);
      router.refresh();
    });
  }

  return { code, setCode: (value: string) => (setCode(formatCode(value)), setError(null)), error, pending, submit };
}

function CodeField({ id, value, onChange, error, compact = false }: { id: string; value: string; onChange: (v: string) => void; error: string | null; compact?: boolean }) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      inputMode="text"
      placeholder="K7QH-3MPA"
      maxLength={9}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full min-w-0 rounded-input border-2 border-dashed border-paper-muted/40 bg-paper px-3 font-mono font-bold tracking-[0.24em] text-on-paper uppercase outline-none transition-colors placeholder:tracking-[0.24em] placeholder:text-paper-muted/45 focus:border-solid focus:border-ocean aria-invalid:border-danger ${
        compact ? "h-10 text-sm" : "h-12 text-base"
      }`}
    />
  );
}

/** The full sheet: what an artist code opens, why codes exist, and the stub to type it on. */
export function CodeSheet({ handle }: { handle: string }) {
  const id = useId();
  const [done, setDone] = useState<{ inviter: string | null } | null>(null);
  const { code, setCode, error, pending, submit } = useRedeem((inviter) => setDone({ inviter }));

  if (done) {
    return (
      <section aria-live="polite" className="grain relative rounded-panel bg-paper p-6 text-on-paper shadow-lift sm:p-8">
        <Stamp tone="lilac" onPaper className="animate-stamp -rotate-6 text-sm">
          ✦ Artist
        </Stamp>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">You&apos;re an Artiflow artist.</h2>
        <p className="mt-2 max-w-prose text-paper-muted">
          {done.inviter ? (
            <>
              Let in with <span className="font-semibold text-on-paper">@{done.inviter}</span>&apos;s code. They&apos;ll get a note that you made it.
            </>
          ) : (
            "Your studio is open."
          )}{" "}
          Your profile wears the Artist mark now, and you got {CODES_PER_NEW_ARTIST} codes of your own to let {CODES_PER_NEW_ARTIST} more artists in.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/studio" className={buttonClasses()}>
            Open your studio
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/codes" className={buttonClasses({ variant: "secondary" })}>
            See your {CODES_PER_NEW_ARTIST} codes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${id}-title`} className="grain relative overflow-hidden rounded-panel bg-paper text-on-paper shadow-lift">
      <div className="grid gap-x-10 gap-y-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-paper-muted uppercase">Artist code</p>
          <h2 id={`${id}-title`} className="mt-2 font-display text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-[1.75rem]">
            Selling here starts with an artist code.
          </h2>
          <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-paper-muted">{WHY_CODES}</p>
          <ul className="mt-5 space-y-3">
            {ARTIST_UNLOCKS.map((unlock) => (
              <li key={unlock.title} className="flex gap-3">
                <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-lilac/15 text-lilac-ink dark:text-lilac">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>
                  <span className="block font-semibold">{unlock.title}</span>
                  <span className="block text-sm text-paper-muted">{unlock.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* The stub you write the code on: a perforated ticket. */}
        <form onSubmit={submit} className="self-center">
          <div
            className="rounded-[14px] bg-ice-lilac/60 p-5 pb-6 dark:bg-lilac/10"
            style={{
              maskImage: "radial-gradient(circle at 0 50%, transparent 9px, black 9.5px), radial-gradient(circle at 100% 50%, transparent 9px, black 9.5px)",
              maskComposite: "intersect",
              WebkitMaskImage: "radial-gradient(circle at 0 50%, transparent 9px, black 9.5px), radial-gradient(circle at 100% 50%, transparent 9px, black 9.5px)",
              WebkitMaskComposite: "source-in",
            }}
          >
            <div className="flex items-center gap-4">
              <Envelope open={Boolean(code)} />
              <label htmlFor={`${id}-code`} className="font-display text-base font-bold">
                Your code
                <span className="block text-xs font-medium text-paper-muted">From the artist who invited you.</span>
              </label>
            </div>
            <div className="mt-5 border-t-2 border-dashed border-paper-muted/25 pt-5">
              <CodeField id={`${id}-code`} value={code} onChange={setCode} error={error} />
              {error && (
                <p id={`${id}-code-error`} role="alert" className="mt-2 text-sm font-semibold text-danger">
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending || code.replace(/-/g, "").length < 8} className={buttonClasses({ size: "lg", className: "mt-3 w-full" })}>
                {pending && <LoaderCircle aria-hidden className="animate-spin" />}
                Unlock my studio
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-paper-muted">
            No code yet? Ask an artist you know. You can keep browsing and commissioning meanwhile.
          </p>
        </form>
      </div>
    </section>
  );
}

/** On your own profile: a strip that keeps asking, until you're in. */
export function CodeStrip() {
  const id = useId();
  // The welcome takes over (see artist-welcome.tsx); this strip leaves once you're an artist.
  const { code, setCode, error, pending, submit } = useRedeem(() => {});

  return (
    <section
      aria-labelledby={`${id}-title`}
      data-part="artist-code-strip"
      className="grain relative flex flex-col gap-4 rounded-card bg-paper p-4 text-on-paper shadow-soft sm:flex-row sm:items-center sm:gap-5 sm:pl-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Envelope open={Boolean(code)} />
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-display text-[0.9375rem] font-bold">
            Are you an artist?
          </h2>
          <p className="text-sm text-paper-muted">
            An artist code opens your studio: commissions and adoptables.{" "}
            <Link href="/codes" className="font-semibold text-on-paper underline decoration-paper-muted/40 underline-offset-2 hover:decoration-ocean">
              How codes work
            </Link>
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="w-full sm:w-auto">
        <div className="flex gap-2">
          <label htmlFor={`${id}-code`} className="sr-only">
            Artist code
          </label>
          <span className="w-full sm:w-44">
            <CodeField id={`${id}-code`} value={code} onChange={setCode} error={error} compact />
          </span>
          <button type="submit" disabled={pending || code.replace(/-/g, "").length < 8} className={buttonClasses({ className: "shrink-0" })}>
            {pending && <LoaderCircle aria-hidden className="animate-spin" />}
            Unlock
          </button>
        </div>
        {error && (
          <p id={`${id}-code-error`} role="alert" className="mt-1.5 text-xs font-semibold text-danger sm:max-w-[16rem]">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
