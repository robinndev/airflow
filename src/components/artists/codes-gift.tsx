"use client";

import { Caveat } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import { markCodesSeen } from "@/app/(site)/artist-actions";
import { HandNote, Sparkle } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";


// The artist's hand, for the asides (it lives in the site layout, outside pages that load it).
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
/*
 * "You've got artist codes!" A little gift on your next visit after codes
 * arrive: an envelope tied with a ribbon, the tickets fanning out of it one
 * by one. It shows once: closing it (any way) marks the codes seen, so it
 * comes back only when new codes arrive (`profiles.codes_seen_at`). On
 * /codes itself the page is the news, so it just marks them seen.
 */

const TICKET_TONES = ["bg-lilac/25", "bg-sky/25", "bg-mint/25", "bg-like/20", "bg-star/30", "bg-ocean/15"];

export function CodesGift({
  fresh,
  reason = "grant",
  invitedBy,
}: {
  fresh: number;
  /** grant: the team's; weekly: Flow+'s; verified: the prize for reaching the goals. */
  reason?: "grant" | "weekly" | "verified";
  invitedBy?: string;
}) {
  const weekly = reason === "weekly";
  const verified = reason === "verified";
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const seen = useRef(false);

  function markSeen() {
    if (seen.current) return;
    seen.current = true;
    void markCodesSeen().catch(() => {});
  }

  useEffect(() => {
    if (pathname === "/codes") return markSeen();
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fresh <= 0) return null;
  const shown = Math.min(fresh, 6);
  const spread = shown === 1 ? 0 : 44;

  return (
    <dialog
      ref={ref}
      aria-labelledby="codes-gift-title"
      onClose={markSeen}
      onClick={(e) => {
        // A click on the backdrop closes it.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className={`${hand.variable} m-auto w-[min(27rem,calc(100vw-2rem))] overflow-visible rounded-panel bg-transparent p-0 text-on-paper outline-none backdrop:bg-scrim/55 backdrop:backdrop-blur-[3px] open:animate-rise`}
    >
      <div className="grain relative rounded-panel bg-paper px-6 pt-4 pb-6 text-center shadow-lift sm:px-8">
        {/* The gift: tickets fanning out of a ribboned envelope. */}
        <div aria-hidden className="relative mx-auto -mt-20 h-48 w-64">
          {Array.from({ length: shown }, (_, i) => {
            const t = shown === 1 ? 0.5 : i / (shown - 1);
            const angle = -spread / 2 + t * spread;
            return (
              <span
                key={i}
                className="absolute bottom-16 left-1/2 origin-bottom motion-safe:animate-rise"
                style={{ rotate: `${angle}deg`, translate: "-50% 0", animationDelay: `${250 + i * 110}ms` } as CSSProperties}
              >
                <span
                  className={`flex h-24 w-14 flex-col items-center justify-start rounded-[6px] pt-2.5 font-display text-[0.5rem] leading-[1.15] font-extrabold tracking-[0.16em] text-on-paper/70 uppercase shadow-soft ${TICKET_TONES[i % TICKET_TONES.length]} bg-paper`}
                  style={{
                    maskImage: "radial-gradient(circle at 0 70%, transparent 5px, black 5.5px), radial-gradient(circle at 100% 70%, transparent 5px, black 5.5px)",
                    maskComposite: "intersect",
                    WebkitMaskImage: "radial-gradient(circle at 0 70%, transparent 5px, black 5.5px), radial-gradient(circle at 100% 70%, transparent 5px, black 5.5px)",
                    WebkitMaskComposite: "source-in",
                    backgroundBlendMode: "multiply",
                  }}
                >
                  Admit
                  <br />
                  one
                  <span className="mt-auto mb-2 text-[0.625rem] tracking-normal text-on-paper/60">♡</span>
                </span>
              </span>
            );
          })}
          <Envelope />
          <Sparkle className="absolute top-6 left-2 size-5 text-lilac motion-safe:animate-twinkle" />
          <Sparkle className="absolute top-2 right-6 size-4 text-sky motion-safe:animate-twinkle [animation-delay:600ms]" />
          <Sparkle className="absolute right-0 bottom-20 size-3 text-mint motion-safe:animate-twinkle [animation-delay:1200ms]" />
          <Sparkle className="absolute bottom-24 left-0 size-3 text-like motion-safe:animate-twinkle [animation-delay:900ms]" />
        </div>

        <HandNote tone="lilac" className="-rotate-3 text-[1.75rem]">
          {verified ? "you did it ✦" : "for you ♡"}
        </HandNote>
        <h2 id="codes-gift-title" className="mt-1 font-display text-2xl leading-tight font-extrabold tracking-tight text-balance">
          {verified
            ? "You're a verified artist!"
            : weekly && fresh === 1
              ? "Your weekly artist code is here!"
              : `You've got ${fresh} artist ${fresh === 1 ? "code" : "codes"}!`}
        </h2>
        <p className="mx-auto mt-2 max-w-[22rem] text-[0.9375rem] leading-relaxed text-paper-muted">
          {verified ? (
            <>
              You reached the goals: followers who love your work and your first sales. The verified mark is on your profile, and here are{" "}
              {fresh} codes to let {fresh} more artists into Artiflow.
            </>
          ) : weekly ? (
            <>A thank-you for being on Flow+: one more artist you can let into Artiflow this week. Codes work once, so hand it out with love.</>
          ) : invitedBy ? (
            <>
              Welcome in! Like <span className="font-semibold text-on-paper">@{invitedBy}</span> did for you, you can now let{" "}
              {fresh === 1 ? "one more artist" : `${fresh} more artists`} into Artiflow.
            </>
          ) : (
            <>Each one lets an artist you trust open their studio on Artiflow. Codes work once, so hand them out with love.</>
          )}
        </p>
        <p className="mx-auto mt-3 max-w-[22rem] text-xs text-paper-muted">
          Send them in Messages · never sell or post them publicly
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-center">
          <button
            type="button"
            autoFocus
            onClick={() => {
              ref.current?.close();
              router.push("/codes");
            }}
            className={buttonClasses({ size: "lg" })}
          >
            See my codes
            <ArrowRight aria-hidden />
          </button>
          <button type="button" onClick={() => ref.current?.close()} className={buttonClasses({ variant: "ghost", size: "lg" })}>
            Later
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A lilac envelope tied with a ribbon and a bow, a heart seal in the middle. */
function Envelope() {
  return (
    <svg viewBox="0 0 160 104" className="absolute bottom-0 left-1/2 w-44 -translate-x-1/2 drop-shadow-[0_8px_10px_rgb(var(--shadow-rgb)/0.18)]">
      <rect x="4" y="18" width="152" height="84" rx="10" className="fill-[color-mix(in_oklab,var(--lilac)_30%,var(--paper))]" />
      <path d="M4 30 L80 72 L156 30 L156 92 Q156 102 146 102 L14 102 Q4 102 4 92 Z" className="fill-[color-mix(in_oklab,var(--lilac)_18%,var(--paper))]" />
      <path d="M4 92 L64 60 M156 92 L96 60" className="stroke-[color-mix(in_oklab,var(--lilac)_40%,var(--paper))]" strokeWidth="2" fill="none" />
      {/* The ribbon around it, and the bow. */}
      <rect x="72" y="18" width="16" height="84" className="fill-like/70" />
      <path d="M80 26 C 62 6, 44 14, 58 28 C 64 34, 74 30, 80 26 Z M80 26 C 98 6, 116 14, 102 28 C 96 34, 86 30, 80 26 Z" className="fill-like" />
      <path d="M78 28 L70 44 M82 28 L90 44" className="stroke-like" strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="26" r="6" className="fill-[color-mix(in_oklab,var(--like)_80%,black)]" />
      {/* A heart seal. */}
      <path d="M80 80 C 70 72, 70 64, 76 63 C 78.5 62.5, 80 64.5, 80 66 C 80 64.5, 81.5 62.5, 84 63 C 90 64, 90 72, 80 80 Z" className="fill-paper" />
    </svg>
  );
}
