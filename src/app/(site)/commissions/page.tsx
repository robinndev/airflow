import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import Link from "next/link";
import { Brush } from "lucide-react";
import { Suspense } from "react";
import { BlankPlanner, QueueSkeleton, SignedOutQueue } from "@/components/commissions/queue/bare-queue";
import { Planner, PlannerSkeleton } from "@/components/commissions/queue/planner";
import { QueueWorkspace } from "@/components/commissions/queue/queue-workspace";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { getViewerQueue } from "@/lib/commissions/queries";

// The artist's handwriting: the hand-lettered title and the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Your commissions",
  description: "Every commission you've taken on, from the first request to the final file, as a board or a ledger.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * The artist's commission queue, kept like a studio desk: a planner page with
 * the week's deadlines, and the work itself as tickets on a cutting mat
 * (board) or lines in a ledger. The masthead prerenders; the rest is the
 * viewer's own and streams in.
 */
export default function CommissionsPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        {/* Starts under the header (transparent until scrolled), so the grain and the wash reach the top. */}
        <section
          aria-labelledby="queue-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash id="queue-wash" className="top-[-10%] right-[-14%] h-[120%] w-[72%] opacity-80 max-lg:top-[45%] max-lg:w-[130%]" />
          <div
            className={`${container} relative grid grid-cols-1 items-center gap-x-12 gap-y-14 pt-10 pb-12 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-16 lg:pb-14`}
          >
            <div>
              <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
                <Brush aria-hidden className="size-3.5 text-ocean" />
                Your commissions
              </p>
              <h1
                id="queue-heading"
                className="mt-4 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem]"
              >
                On your{" "}
                <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
                  easel.
                  <Scribble className="absolute right-[-6%] -bottom-3.5 w-[90%] text-mint" />
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
                Every commission you&apos;ve taken on, from the first request to the final file. Open a ticket to
                quote, start and deliver; it moves along as the work does. Or read it all in the ledger.
              </p>
              <Suspense>
                <FirstOrderNote />
              </Suspense>
              <Sparkle className="absolute top-20 left-[44%] hidden size-5 text-lilac lg:block" />
            </div>

            <Suspense fallback={<PlannerSkeleton />}>
              <YourWeek />
            </Suspense>
          </div>
        </section>

        <section aria-label="Commission queue" className="mx-auto w-full max-w-[1440px] px-4 sm:px-6">
          <Suspense fallback={<QueueSkeleton />}>
            <Workspace />
          </Suspense>
        </section>
      </main>
    </>
  );
}

/** No orders yet: say where they come from, and where to open for them. */
async function FirstOrderNote() {
  const queue = await getViewerQueue();
  if (!queue || queue.orders.length > 0) return null;
  return (
    <div className="relative mt-7 max-w-md -rotate-[0.6deg] rounded-[4px] bg-paper py-3 pr-4 pl-5 text-sm leading-snug text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_10px_24px_-14px_rgb(var(--shadow-rgb)/0.4)]">
      <span
        aria-hidden
        className="absolute top-1/2 -left-2.5 h-5 w-7 -translate-y-1/2 -rotate-[8deg] bg-lilac/45 [clip-path:polygon(0_8%,100%_0,96%_50%,100%_100%,0_92%,4%_50%)]"
      />
      <p>
        <span className="font-semibold">No commissions yet.</span>{" "}
        <span className="text-paper-muted">
          When someone requests one of your services, it lands here as a ticket: quote it, start it and deliver it from
          the ticket.
        </span>
      </p>
      <Link href="/studio" className={buttonClasses({ size: "sm", className: "mt-3" })}>
        List a service
      </Link>
    </div>
  );
}

async function YourWeek() {
  const queue = await getViewerQueue();
  return queue ? <Planner queue={queue} /> : <BlankPlanner />;
}

async function Workspace() {
  const queue = await getViewerQueue();
  return queue ? <QueueWorkspace queue={queue} /> : <SignedOutQueue />;
}
