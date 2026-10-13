import type { Metadata } from "next";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { Mail } from "lucide-react";
import { Suspense } from "react";
import { EmptyShow, RequestsSkeleton, SignedOutRequests } from "@/components/commissions/requests/bare-requests";
import { Postcard } from "@/components/commissions/requests/postcard";
import { RequestFilters } from "@/components/commissions/requests/request-filters";
import { ShippingLabel, ShippingLabelSkeleton } from "@/components/commissions/requests/shipping-label";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";
import { getViewerRequests } from "@/lib/commissions/queries";
import { countShows, inShow, isShow, sortRequests, type Show } from "@/lib/commissions/requests";

// The artist's handwriting: the hand-lettered title and the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Your requests",
  description: "Every commission you've asked another artist for, followed like a parcel from the request to the file in your hands.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

const EMPTY: Record<Show, string> = {
  all: "no requests yet. go find an artist you love?",
  yours: "nothing waiting on you",
  waiting: "no one to wait on",
  making: "nothing on an easel right now",
  delivered: "nothing has arrived yet",
  closed: "nothing closed",
};

/*
 * The buyer's side of commissions, kept like the post: every request is a
 * postcard with the art on a stamp worth its price, a postmark for where it
 * stands and the route it travels, under a shipping label with what arrives
 * next. The masthead prerenders; the rest is the viewer's and streams in.
 */
export default function RequestsPage({ searchParams }: PageProps<"/requests">) {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <section
          aria-labelledby="requests-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash id="requests-wash" className="top-[-10%] right-[-14%] h-[120%] w-[72%] opacity-80 max-lg:top-[45%] max-lg:w-[130%]" />
          <div
            className={`${container} relative grid grid-cols-1 items-center gap-x-12 gap-y-14 pt-10 pb-12 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-16 lg:pb-14`}
          >
            <div>
              <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
                <Mail aria-hidden className="size-3.5 text-lilac-ink" />
                Your requests
              </p>
              <h1
                id="requests-heading"
                className="mt-4 font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[4rem]"
              >
                On its{" "}
                <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-lilac-ink">
                  way.
                  <Scribble className="absolute right-[-10%] -bottom-3.5 w-[110%] text-mint" />
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
                Every commission you&apos;ve asked another artist for, from the first message to the file in your
                hands. Follow each one like a parcel: where it is, what it costs and when it lands.
              </p>
              <Sparkle className="absolute top-20 left-[40%] hidden size-5 text-sky lg:block" />
            </div>

            <Suspense fallback={<ShippingLabelSkeleton />}>
              <Label />
            </Suspense>
          </div>
        </section>

        <section aria-label="Requests" className={container}>
          <Suspense fallback={<RequestsSkeleton />}>
            <Postbox searchParams={searchParams} />
          </Suspense>
        </section>
      </main>
    </>
  );
}

async function Label() {
  const data = await getViewerRequests();
  if (!data) return null;
  return <ShippingLabel handle={data.handle} requests={data.requests} today={data.today} />;
}

async function Postbox({ searchParams }: Pick<PageProps<"/requests">, "searchParams">) {
  const data = await getViewerRequests();
  if (!data) return <SignedOutRequests />;

  const param = (await searchParams).show;
  const show: Show = isShow(param) ? param : "all";
  const shown = sortRequests(data.requests.filter((request) => inShow(request, show)));

  return (
    <>
      <RequestFilters show={show} counts={countShows(data.requests)} />
      <div className="mt-8">
        {data.requests.length === 0 ? (
          <EmptyShow
            action={
              <Link href="/explore/search" className={buttonClasses({ size: "sm", className: "mt-5" })}>
                Find an open studio
              </Link>
            }
          >
            {EMPTY.all}
          </EmptyShow>
        ) : shown.length === 0 ? (
          <EmptyShow>{EMPTY[show]}</EmptyShow>
        ) : (
          // A pinboard of postcards: two columns on wide screens, each card where it fits.
          <ul className="columns-1 gap-x-8 lg:columns-2">
            {shown.map((request) => (
              <li key={request.id} className="mb-10 break-inside-avoid">
                <Postcard request={request} today={data.today} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
