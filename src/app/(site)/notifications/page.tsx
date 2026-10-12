import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Suspense } from "react";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { BookFallback, ClosedBook, GuestBook } from "@/components/notifications/guest-book";
import { sinceMonth } from "@/components/notifications/time";
import { SiteHeader } from "@/components/site/site-header";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

// The artist's handwriting: the hand-lettered title and the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Notifications",
  description: "Likes, comments, follows, reposts and commission requests, signed into your guest book.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * Notifications, kept like the guest book on an artist-alley table: the
 * people who stopped by sign it. The masthead prerenders; the book is the
 * viewer's own and opens in the browser (dates in their own clock).
 */
export default function NotificationsPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <section
          aria-labelledby="notifications-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash id="notifications-wash" className="top-[-20%] right-[-14%] h-[130%] w-[70%] opacity-70 max-lg:w-[120%]" />
          <div className={`${container} relative pt-10 pb-4 sm:pt-14 lg:pt-16`}>
            <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
              <Bell aria-hidden className="size-3.5 fill-current text-ocean" />
              Notifications
            </p>
            <h1
              id="notifications-heading"
              className="mt-4 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem]"
            >
              Who stopped{" "}
              <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
                by.
                <Scribble className="absolute right-[-12%] -bottom-3.5 w-[130%] text-mint" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
              Everyone who liked, commented, followed, reposted or asked for a commission, signed into your guest book.
            </p>
            <Sparkle className="absolute top-20 left-[52%] hidden size-5 text-lilac lg:block" />
          </div>
        </section>

        <div className={container}>
          <Suspense fallback={<BookFallback />}>
            <Book />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Book() {
  const viewer = await getViewer();
  const profile = viewer && (await getProfile(viewer.handle));
  if (!profile) {
    return (
      <ClosedBook>
        <p className="font-display text-lg font-bold text-on-paper">Your guest book opens when you sign in.</p>
        <p className="mt-1 text-sm text-paper-muted">Likes, comments, follows and commission requests get signed in here.</p>
        <Link
          href="/sign-in?next=/notifications"
          className="mt-5 inline-flex h-10 items-center rounded-full bg-ocean px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-105"
        >
          Sign in
        </Link>
      </ClosedBook>
    );
  }
  return (
    <div className="mt-6">
      <GuestBook owner={{ name: profile.displayName, handle: profile.handle, since: sinceMonth(profile.joinedAt) }} />
    </div>
  );
}
