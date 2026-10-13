import Link from "next/link";
import { HandNote, Tape } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";
import type { ReactNode } from "react";

/*
 * Requests before they load, for visitors, and when a filter is empty: the
 * outlines where postcards would sit.
 */

function Ghost({ breathing = false, tilt }: { breathing?: boolean; tilt: number }) {
  return (
    <div
      className={`h-72 rounded-[6px] ${breathing ? "skeleton bg-paper/70" : "border-2 border-dashed border-ink/10"}`}
      style={{ rotate: `${tilt}deg` }}
    />
  );
}

export function RequestsSkeleton() {
  return (
    <div aria-busy aria-label="Loading your requests">
      <div className="flex gap-1.5">
        {[4, 6, 7, 6].map((w, i) => (
          <span key={i} className="h-9 skeleton rounded-full bg-surface" style={{ width: `${w}rem` }} />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Ghost breathing tilt={-0.6} />
        <Ghost breathing tilt={0.5} />
      </div>
    </div>
  );
}

export function SignedOutRequests() {
  return (
    <div className="relative">
      <div aria-hidden className="grid gap-8 lg:grid-cols-2">
        <Ghost tilt={-0.6} />
        <Ghost tilt={0.5} />
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="grain relative w-full max-w-md -rotate-[0.8deg] rounded-[4px] bg-paper px-6 pt-8 pb-7 text-center text-on-paper shadow-lift sm:px-9">
          <Tape tone="lilac" className="-top-3 left-1/2 -translate-x-1/2 -rotate-2" />
          <h2 className="font-display text-xl leading-tight font-extrabold">Your requests live here.</h2>
          <p className="mt-2 text-sm leading-relaxed text-paper-muted">
            Sign in to follow every commission you&apos;ve asked for, from the first message to the file in your hands.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/sign-in?next=/requests" className={buttonClasses()}>
              Sign in
            </Link>
            <Link
              href="/join"
              className="inline-flex h-10 items-center justify-center rounded-action border border-on-paper/15 px-4 text-sm font-semibold text-on-paper transition-colors hover:bg-on-paper/5"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyShow({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-[24px] border-2 border-dashed border-border px-6 py-16 text-center">
      <HandNote tone="muted" className="text-2xl">
        {children}
      </HandNote>
      {action}
    </div>
  );
}
