import type { Metadata } from "next";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { Suspense } from "react";
import { Check, Ticket, X } from "lucide-react";
import { ArtistPass, passNumber } from "@/components/artists/artist-pass";
import { SharePassButton } from "@/components/artists/artist-welcome";
import { CodeSheet } from "@/components/artists/code-sheet";
import { CodeTickets } from "@/components/artists/code-tickets";
import { Scribble } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { ANSWERABLE, CODE_RULES, sinceMonth, WHY_CODES } from "@/lib/artists/codes";
import { getViewerAccess, getViewerCodes, getViewerPass } from "@/lib/artists/server";

// The artist's handwriting, for the title.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Artist codes",
  description: "Artist codes let artists sell on Artiflow. Every artist here was let in by another, with a code that works once.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * Artist codes, from both sides. Without artist access: the code sheet to
 * type one on. With it: your artist pass (since when, whose code) and the
 * codes you hold to hand on, each a ticket that shows who used it. The
 * masthead prerenders; the rest is the viewer's own and streams in.
 */
export default function CodesPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <section aria-labelledby="codes-heading" className="grain relative -mt-16 pt-16">
          <div className={`${container} pt-10 pb-8 sm:pt-14`}>
            <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
              <Ticket aria-hidden className="size-3.5 text-lilac" />
              Artist codes
            </p>
            <h1 id="codes-heading" className="mt-3 font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.03em] text-ink sm:text-[3.5rem]">
              Artists let{" "}
              <span className="relative inline-block font-hand text-[1.25em] leading-[0.8] font-bold tracking-normal text-lilac-ink dark:text-lilac">
                artists in.
                <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
              Anyone can join to browse, collect and commission. Selling takes an artist code, and each code works once. {WHY_CODES}
            </p>
          </div>
        </section>

        <div className={container}>
          <Suspense fallback={<div className="skeleton h-80 rounded-panel" />}>
            <Codes />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Codes() {
  const access = await getViewerAccess();
  if (!access) {
    return (
      <div className="rounded-panel border border-dashed border-border bg-surface px-6 py-14 text-center">
        <p className="font-display text-lg font-bold text-ink">Sign in to use or share an artist code</p>
        <p className="mt-1 text-sm text-muted">No account yet? Join first: you can add your code while you sign up.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/sign-in?next=/codes" className={buttonClasses({ variant: "secondary" })}>
            Sign in
          </Link>
          <Link href="/join" className={buttonClasses()}>
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!access.artist) return <CodeSheet handle={access.handle} />;

  const [codes, pass] = await Promise.all([getViewerCodes(), getViewerPass()]);
  const left = codes.filter((c) => !c.usedAt).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-8">
        {/* Your own pass. */}
        {pass && (
          <section aria-labelledby="pass-heading" className="dot-paper grid items-center gap-6 rounded-panel bg-[size:14px_14px] p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-8">
            <ArtistPass pass={pass} />
            <div className="min-w-0">
              <h2 id="pass-heading" className="font-display text-xl font-extrabold tracking-tight text-ink">
                Your Artist Pass
              </h2>
              <p className="mt-1.5 max-w-prose text-sm text-muted">
                {pass.invitedBy ? (
                  <>
                    Artist {passNumber(pass.number)} on Artiflow, let in with{" "}
                    <Link href={`/${pass.invitedBy}`} className="font-semibold text-ink hover:underline">
                      @{pass.invitedBy}
                    </Link>
                    &apos;s code.
                  </>
                ) : (
                  <>Artist {passNumber(pass.number)} on Artiflow: one of our founding artists.</>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pass.shared ? (
                  <Link href={`/${pass.handle}#${pass.shared}`} className={buttonClasses({ variant: "secondary" })}>
                    See your pass post
                  </Link>
                ) : (
                  <SharePassButton pass={pass} />
                )}
                <Link href="/studio" className={buttonClasses({ variant: "ghost" })}>
                  Your studio
                </Link>
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="held-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-dashed border-border pb-2.5">
            <h2 id="held-heading" className="font-display text-xl font-extrabold tracking-tight text-ink">
              Codes to hand on
            </h2>
            {codes.length > 0 && (
              <p className="text-sm text-muted" data-part="codes-count">
                <span className="font-semibold text-ink tabular-nums">{codes.length}</span> {codes.length === 1 ? "code" : "codes"} ·{" "}
                <span className="font-semibold text-ink tabular-nums">{left}</span> to give ·{" "}
                <span className="font-semibold text-ink tabular-nums">{codes.length - left}</span> used
              </p>
            )}
          </div>
          {codes.length > 0 ? (
            <CodeTickets codes={codes} />
          ) : (
            <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="font-display font-bold text-ink">No codes to hand on yet</p>
              <p className="mt-1 text-sm text-muted">The team gives codes to artists to pass on. When you get some, they&apos;ll be here.</p>
            </div>
          )}
        </section>
      </div>

      <aside aria-labelledby="rules-heading" className="h-fit rounded-card border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 id="rules-heading" className="font-display text-base font-bold text-ink">
          Before you hand one on
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          {CODE_RULES.map((rule) => (
            <li key={rule.text} className="flex gap-2.5">
              <span
                aria-label={rule.ok ? "Do" : "Don't"}
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${rule.ok ? "bg-mint/15 text-mint-ink" : "bg-danger/10 text-danger"}`}
              >
                {rule.ok ? <Check aria-hidden className="size-3" strokeWidth={3} /> : <X aria-hidden className="size-3" strokeWidth={3} />}
              </span>
              <span className="text-ink/85">{rule.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">{ANSWERABLE}</p>
      </aside>
    </div>
  );
}
