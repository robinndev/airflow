import type { ReactNode } from "react";
import { Scribble } from "@/components/explore/doodles";
import { continueWithProvider } from "@/app/(auth)/actions";
import { DiscordIcon, GoogleIcon } from "@/components/icons/social-icon";
import { SheetTabs } from "./sheet-tabs";

/**
 * The page you fill in: a loose sheet from a binder, with index tabs for
 * signing in or joining. Lives in the auth layout, so only its contents
 * change between the two.
 */
export function AuthSheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[468px] pt-10">
      <SheetTabs />
      <div className="grain relative z-10 rounded-panel rounded-tl-[10px] bg-surface px-5 pt-8 pb-7 shadow-lift sm:px-10 sm:pt-10 sm:pb-9">
        {children}
      </div>
    </div>
  );
}

/** Sheet heading: a display line ending in a handwritten word. */
export function SheetHeading({ lead, hand, children }: { lead: string; hand: string; children: ReactNode }) {
  return (
    <header className="animate-rise">
      <h1 className="font-display text-[2.125rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        {lead}{" "}
        <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
          {hand}
          <Scribble className="absolute -bottom-1.5 left-[-4%] w-[108%] text-mint" />
        </span>
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{children}</p>
    </header>
  );
}

const providerButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-button border border-border bg-surface text-sm font-semibold text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 [&_svg]:size-[1.125rem]";

/** One-tap accounts, the way most artists already sign in elsewhere. */
export function ProviderButtons({ verb }: { verb: "Sign in" | "Sign up" }) {
  return (
    <form action={continueWithProvider} className="mt-7 grid grid-cols-2 gap-2.5">
      <button type="submit" name="provider" value="google" aria-label={`${verb} with Google`} className={providerButton}>
        <GoogleIcon />
        Google
      </button>
      <button type="submit" name="provider" value="discord" aria-label={`${verb} with Discord`} className={providerButton}>
        <DiscordIcon />
        Discord
      </button>
    </form>
  );
}

/** "or with email", between two hand-drawn squiggles. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted">
      <Squiggle />
      or with email
      <Squiggle />
    </div>
  );
}

function Squiggle() {
  return (
    <svg aria-hidden viewBox="0 0 120 8" preserveAspectRatio="none" className="h-2 min-w-0 flex-1 text-border">
      <path
        d="M0 4q5-4 10 0t10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
