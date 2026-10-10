import { Suspense } from "react";
import { FrameShop } from "@/components/shop/frame-shop";
import { SiteHeader } from "@/components/site/site-header";
import { savedCustomization } from "@/lib/customization/model";
import { fetchOwnedFrames } from "@/lib/customization/queries";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

export const metadata = {
  title: "Frame shop",
  description: "Avatar frames for your Artiflow profile — sakura, neon, holo foil and more.",
};

/** Frames for your avatar. The shelf prerenders; who you are (and what you own) streams in. */
export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1184px] flex-1 px-4 pt-10 pb-24 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Shop</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-balance text-ink">
            Dress up your avatar
          </h1>
          <p className="mt-3 text-base text-pretty text-muted">
            Frames show around your picture on your page. Try any of them on — the free ones are yours to keep.
          </p>
        </header>
        <Suspense fallback={<ShopSkeleton />}>
          <Shop />
        </Suspense>
      </main>
    </>
  );
}

async function Shop() {
  const viewer = await getViewer();
  const [profile, owned] = viewer
    ? await Promise.all([getProfile(viewer.handle), fetchOwnedFrames(viewer.id)])
    : [null, []];

  return (
    <FrameShop
      viewer={profile && { handle: profile.handle, displayName: profile.displayName, avatar: profile.avatar }}
      owned={owned}
      equipped={profile ? (savedCustomization(profile).frame ?? null) : null}
    />
  );
}

function ShopSkeleton() {
  return (
    <div aria-busy aria-label="Loading the shop" className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="skeleton h-[30rem] rounded-panel bg-ice" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-48 rounded-card bg-ice" />
        ))}
      </div>
    </div>
  );
}
