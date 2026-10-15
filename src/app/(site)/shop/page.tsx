import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { ShoppingBag } from "lucide-react";
import { Suspense } from "react";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { SupplyStore } from "@/components/shop/supply-store";
import { SiteHeader } from "@/components/site/site-header";
import { savedCustomization } from "@/lib/customization/model";
import { fetchPlanForUser } from "@/lib/profile/accounts";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { itemKey, itemOf } from "@/lib/shop/catalog";
import { fetchOwnedItems, monthlyPickOf } from "@/lib/shop/server";

// The artist's handwriting: the hand-lettered title, the shelf notes, the jar labels.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Shop",
  description: "Frames, profile effects, animated names and covers, sticker packs and pins for your Artiflow page.",
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * The supply shop. The masthead prerenders; the store is the viewer's own
 * (what they own and wear, their face in the mirror) and streams in.
 */
export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <section aria-labelledby="shop-heading" className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]">
          <Wash id="shop-wash" className="top-[-25%] right-[-14%] h-[120%] w-[62%] opacity-60 max-lg:w-[120%]" />
          <div className={`${container} relative pt-10 pb-8 sm:pt-14`}>
            <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
              <ShoppingBag aria-hidden className="size-3.5 text-ocean" />
              Shop
            </p>
            <h1 id="shop-heading" className="mt-4 font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.035em] text-ink sm:text-[3.5rem]">
              Supplies for{" "}
              <span className="relative inline-block font-hand text-[1.25em] leading-[0.8] font-bold tracking-normal text-ocean">
                your page.
                <Scribble className="absolute -bottom-2.5 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
              Frames, profile effects, animated names and covers, sticker packs and pins. Try anything on in the mirror; the free ones are yours to keep.
            </p>
            <Sparkle className="absolute top-16 left-[60%] hidden size-5 text-lilac lg:block" />
          </div>
        </section>

        <div className={container}>
          <Suspense fallback={<StoreSkeleton />}>
            <Store />
          </Suspense>
        </div>
      </main>
    </>
  );
}

const nextMonth = (now: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));

async function Store() {
  const viewer = await getViewer();
  const [profile, rows, plan] = viewer
    ? await Promise.all([getProfile(viewer.handle), fetchOwnedItems(viewer.id), fetchPlanForUser(viewer.id)])
    : [null, [], "free" as const];
  // getViewer() awaited connection(), so reading the clock is allowed here.
  const now = viewer ? new Date() : new Date(0);
  const picked = viewer ? monthlyPickOf(rows, now) : null;
  const custom = profile ? savedCustomization(profile) : null;

  return (
    <SupplyStore
      viewer={profile && { handle: profile.handle, displayName: profile.displayName, avatar: profile.avatar, banner: profile.banner }}
      owned={rows.map(itemKey)}
      worn={custom ? { frame: custom.frame, effect: custom.effect, nameFx: custom.nameFx, coverFx: custom.coverFx, pin: custom.pin } : {}}
      flowPlus={plan === "flow_plus"}
      pick={picked ? (itemOf(picked.kind, picked.id)?.name ?? null) : null}
      nextPick={nextMonth(now)}
    />
  );
}

function StoreSkeleton() {
  return (
    <div aria-busy aria-label="Opening the shop">
      <div className="skeleton h-12 rounded-t-[14px] bg-ice" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="skeleton mx-auto aspect-[3/4] w-full max-w-[19rem] rounded-t-[999px] rounded-b-[26px] bg-ice" />
        <div className="grid gap-6">
          <div className="skeleton h-20 rounded-card bg-ice" />
          <div className="skeleton h-72 rounded-panel bg-ice" />
        </div>
      </div>
    </div>
  );
}
