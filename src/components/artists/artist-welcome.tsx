"use client";

import { Caveat } from "next/font/google";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, LoaderCircle, Store, Ticket } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { shareArtistPass } from "@/app/(site)/artist-actions";
import { HandNote, Sparkle } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";
import { CODES_FOR_VERIFIED, passCaption, VERIFY_GOALS, type ViewerPass } from "@/lib/artists/codes";
import { ArtistPass } from "./artist-pass";


// The artist's hand, for the asides (it lives in the site layout, outside pages that load it).
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
/*
 * "Welcome, artist!" The moment an artist code goes through: their Artist
 * Pass swings in on its lanyard, confetti in the theme's colors, what just
 * opened, the codes they got to pass on, and the pass ready to post with one
 * click (the caption is theirs to change). Raised from anywhere with
 * showArtistWelcome(); <ArtistWelcomeHost> lives in the site layout, so it
 * stays up while the page behind it re-renders (the code strip that raised it
 * disappears the moment you're an artist).
 */

const EVENT = "artiflow:artist-welcome";

type WelcomeDetail = { pass: ViewerPass; /** Codes they just got to pass on (left out when it's not news). */ codes?: number };

export function showArtistWelcome(pass: ViewerPass, codes?: number) {
  window.dispatchEvent(new CustomEvent<WelcomeDetail>(EVENT, { detail: { pass, codes } }));
}

const CONFETTI = ["bg-lilac", "bg-sky", "bg-mint", "bg-like", "bg-star", "bg-ocean"];

/** A button that opens the welcome on your pass (on /codes, for artists who haven't shared it). */
export function SharePassButton({ pass }: { pass: ViewerPass }) {
  return (
    <button type="button" onClick={() => showArtistWelcome(pass)} className={buttonClasses()}>
      Share my Artist Pass
    </button>
  );
}

export function ArtistWelcomeHost() {
  const [detail, setDetail] = useState<WelcomeDetail | null>(null);
  useEffect(() => {
    const open = (event: Event) => setDetail((event as CustomEvent<WelcomeDetail>).detail);
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);
  return detail ? <Welcome key={detail.pass.handle} pass={detail.pass} codes={detail.codes} onClose={() => setDetail(null)} /> : null;
}

function Welcome({ pass, codes, onClose }: { pass: ViewerPass; codes?: number; onClose: () => void }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [caption, setCaption] = useState(passCaption(pass.invitedBy));
  const [shared, setShared] = useState<string | null>(pass.shared ? `/${pass.handle}#${pass.shared}` : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const first = pass.name.split(" ")[0];

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function share() {
    setError(null);
    startTransition(async () => {
      const result = await shareArtistPass(caption).catch(() => null);
      if (!result) return setError("Couldn't reach the studio. Try again in a moment.");
      if (!result.ok) return setError(result.error);
      setShared(result.href);
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      className={`${hand.variable} m-auto max-h-[calc(100dvh-1.5rem)] w-[min(52rem,calc(100vw-1.5rem))] overflow-x-hidden overflow-y-auto rounded-panel bg-paper p-0 text-on-paper shadow-lift outline-none backdrop:bg-scrim/60 backdrop:backdrop-blur-[3px] open:animate-rise`}
    >
      <div className="grain relative grid md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        {/* The pass, on a dotted table, under falling confetti. */}
        <div className="dot-paper relative overflow-hidden bg-[size:14px_14px] px-6 pt-6 pb-8">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 18 }, (_, i) => (
              <span
                key={i}
                className={`absolute top-[-8%] block h-2.5 w-1.5 rounded-[1px] opacity-0 motion-safe:animate-[confetti_2.8s_ease-in_forwards] ${CONFETTI[i % CONFETTI.length]}`}
                style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 140 + Math.floor(i / 6) * 260}ms`, rotate: `${(i * 37) % 90}deg` }}
              />
            ))}
          </div>
          <Sparkle className="absolute top-8 right-6 size-5 text-lilac motion-safe:animate-twinkle" />
          <Sparkle className="absolute bottom-12 left-5 size-4 text-sky motion-safe:animate-twinkle [animation-delay:700ms]" />
          <div className="origin-top motion-safe:animate-[pass-swing_1.4s_cubic-bezier(0.3,1.4,0.5,1)_both]">
            <ArtistPass pass={pass} />
          </div>
        </div>

        <div className="flex flex-col px-6 py-7 sm:px-8">
          <HandNote tone="lilac" className="-rotate-2 text-[1.75rem]">
            it&apos;s official ✦
          </HandNote>
          <h2 id={`${id}-title`} className="mt-1 font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">
            Welcome to the artists, {first}!
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-paper-muted">
            {pass.invitedBy ? (
              <>
                <span className="font-semibold text-on-paper">@{pass.invitedBy}</span> let you in. Your studio is open: commissions and adoptables are yours to list.
              </>
            ) : (
              "Your studio is open: commissions and adoptables are yours to list."
            )}
          </p>

          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2.5">
              <span aria-hidden className="grid size-6 place-items-center rounded-full bg-lilac/15 text-lilac-ink dark:text-lilac">
                <Store className="size-3.5" />
              </span>
              The Artist mark is on your profile now.
            </li>
            {codes !== undefined ? (
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-mint/15 text-mint-ink">
                  <Ticket className="size-3.5" />
                </span>
                You got {codes} codes of your own, to let {codes} more artists in.
              </li>
            ) : (
              !pass.verifiedAt && (
                <li className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint-ink">
                    <BadgeCheck className="size-3.5" />
                  </span>
                  <span>
                    Next: {VERIFY_GOALS.followers} followers and ${VERIFY_GOALS.salesUsd} in sales make you a{" "}
                    <span className="font-semibold">verified artist</span>, with {CODES_FOR_VERIFIED} codes to invite more artists.
                  </span>
                </li>
              )
            )}
          </ul>

          {/* Share the pass: a post on your profile and in your followers' feeds. */}
          <div className="mt-6 rounded-card border-2 border-dashed border-paper-muted/30 p-4">
            {shared ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-mint text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="font-semibold">Your pass is up on your profile.</span>
                <Link href={shared} onClick={() => ref.current?.close()} className="font-semibold text-ocean hover:underline">
                  See the post
                </Link>
              </p>
            ) : (
              <>
                <label htmlFor={`${id}-caption`} className="block text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase">
                  Tell everyone
                </label>
                <textarea
                  id={`${id}-caption`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  className="mt-1.5 field-sizing-content max-h-32 w-full resize-none border-0 border-b-2 border-dashed border-paper-muted/35 bg-transparent px-0.5 pb-1.5 text-[0.9375rem] text-on-paper outline-none focus:border-solid focus:border-ocean"
                />
                {error && (
                  <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
                    {error}
                  </p>
                )}
                <button type="button" onClick={share} disabled={pending} className={buttonClasses({ className: "mt-3 w-full" })}>
                  {pending && <LoaderCircle aria-hidden className="animate-spin" />}
                  Share my Artist Pass
                </button>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/studio" onClick={() => ref.current?.close()} className={buttonClasses({ variant: "secondary" })}>
              Open my studio
              <ArrowRight aria-hidden />
            </Link>
            {codes !== undefined && (
              <Link href="/codes" onClick={() => ref.current?.close()} className={buttonClasses({ variant: "ghost" })}>
                See my {codes} codes
              </Link>
            )}
            <button type="button" onClick={() => ref.current?.close()} className={buttonClasses({ variant: "ghost", className: "ml-auto" })}>
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
