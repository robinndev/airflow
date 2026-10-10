import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Studio } from "@/components/customize/studio";
import { TABS, type TabId } from "@/components/customize/tabs";
import { SiteHeader } from "@/components/site/site-header";
import { EMPTY_BOARD } from "@/lib/customization/about";
import { profileFontVariables } from "@/lib/customization/fonts";
import { savedCustomization } from "@/lib/customization/model";
import { fetchOwnedFrames } from "@/lib/customization/queries";
import { fetchPlanForUser } from "@/lib/profile/accounts";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Customize your page" };

/** The customizer: theme, name, buttons, frame, About board and CSS for your own page. */
export default function CustomizePage({ searchParams }: PageProps<"/customize">) {
  return (
    <>
      <SiteHeader />
      <main className={`${profileFontVariables} flex-1`}>
        <Suspense fallback={<StudioSkeleton />}>
          <StudioLoader searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function StudioLoader({ searchParams }: Pick<PageProps<"/customize">, "searchParams">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/customize");

  const [profile, plan, owned, params] = await Promise.all([
    getProfile(viewer.handle),
    fetchPlanForUser(viewer.id),
    fetchOwnedFrames(viewer.id),
    searchParams,
  ]);
  if (!profile) redirect("/join/handle?next=/customize");

  const tab = TABS.find((t) => t.id === params.tab)?.id ?? ("theme" satisfies TabId);

  return (
    <Studio
      profile={{
        handle: profile.handle,
        displayName: profile.displayName,
        headline: profile.headline,
        bio: profile.bio,
        avatar: profile.avatar,
        banner: profile.banner,
      }}
      initialCustom={savedCustomization(profile)}
      initialBoard={profile.about ?? EMPTY_BOARD}
      isPaid={plan === "flow_plus"}
      owned={owned}
      initialTab={tab}
    />
  );
}

function StudioSkeleton() {
  return (
    <div aria-busy aria-label="Loading the customizer" className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="skeleton h-10 w-64 rounded-input bg-ice" />
      <div className="skeleton mt-6 h-11 w-[34rem] max-w-full rounded-full bg-ice" />
      <div className="mt-5 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="skeleton h-[32rem] rounded-panel bg-ice" />
        <div className="skeleton h-[32rem] rounded-panel bg-ice" />
      </div>
    </div>
  );
}
