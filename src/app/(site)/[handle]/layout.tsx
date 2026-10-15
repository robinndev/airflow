import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodeStrip } from "@/components/artists/code-sheet";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileShortcutsCompact, ProfileSidebar } from "@/components/profile/profile-sidebar";
import { ProfileSkeleton } from "@/components/profile/skeletons";
import { SiteHeader } from "@/components/site/site-header";
import { scopeCustomCss } from "@/lib/customization/css";
import { profileFontVariables } from "@/lib/customization/fonts";
import { customizationFor } from "@/lib/customization/model";
import { canvasData, canvasStyle } from "@/lib/customization/style";
import { appearanceStyle, resolveAppearance } from "@/lib/profile/appearance";
import { getFeaturedHandles, getProfile, normalizeHandle } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

/*
 * Rendering model (Cache Components + Partial Prefetching):
 * - Featured handles are fully prerendered at build time.
 * - Any other handle gets the App Shell (skeleton) instantly, then streams in
 *   and is stored for the next visit.
 * - Profile data is cached with `use cache` and invalidated by tag on edit.
 * - Viewer-specific bits (owner controls, follow state) are small dynamic
 *   holes behind their own <Suspense> boundaries.
 */

export async function generateStaticParams() {
  const handles = await getFeaturedHandles();
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[handle]">): Promise<Metadata> {
  const profile = await getProfile(normalizeHandle((await params).handle));
  if (!profile) return { title: "Artist not found" };

  const title = `${profile.displayName} (@${profile.handle})`;
  return {
    title,
    description: profile.bio,
    openGraph: {
      title,
      description: profile.bio,
      type: "profile",
      images: [{ url: profile.banner.src, width: profile.banner.width, height: profile.banner.height }],
    },
  };
}

export default function ProfileLayout({ params, children }: LayoutProps<"/[handle]">) {
  return (
    <div>
      {/*
        One header for the skeleton and the profile: it stays mounted while
        the profile streams in, instead of remounting (and blinking) with it.
      */}
      <SiteHeader overlay handle={params.then(({ handle }) => normalizeHandle(handle))} />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileFrame params={params}>{children}</ProfileFrame>
      </Suspense>
    </div>
  );
}

async function ProfileFrame({
  params,
  children,
}: Pick<LayoutProps<"/[handle]">, "params" | "children">) {
  const profile = await getProfile(normalizeHandle((await params).handle));
  if (!profile) notFound();

  const appearance = resolveAppearance(profile);
  // What the artist designed, minus anything their plan doesn't include.
  const custom = customizationFor(profile);
  const sidebarRight = custom.layout.sidebar === "right";

  return (
    <div style={appearanceStyle(appearance)} className={profileFontVariables}>
      {/*
        The canvas: the artist's palette, background and custom CSS apply
        only in here, never to the header (the layout's). It slides under the
        floating header (-mt-16) so the banner stays full-bleed.
      */}
      <div
        data-profile-canvas={profile.handle}
        {...canvasData(custom)}
        style={canvasStyle(custom)}
        className="-mt-16 min-h-dvh pb-24"
      >
        {custom.css && <style>{scopeCustomCss(custom.css, profile.handle)}</style>}
        <ProfileHero profile={profile} appearance={appearance} custom={custom} />
        {profile.artist === null && (
          <Suspense>
            <OwnerCodeStrip handle={profile.handle} />
          </Suspense>
        )}

        <div
          className={`mx-auto mt-8 grid max-w-[1184px] gap-6 px-4 sm:px-6 lg:px-8 ${
            sidebarRight
              ? "lg:grid-cols-[minmax(0,1fr)_300px]"
              : "lg:grid-cols-[300px_minmax(0,1fr)]"
          }`}
        >
          <aside
            aria-label={`${profile.displayName}'s shortcuts`}
            className={`hidden lg:sticky lg:top-24 lg:block lg:self-start ${sidebarRight ? "lg:order-last" : ""}`}
          >
            <ProfileSidebar profile={profile} />
          </aside>
          <div className="lg:hidden">
            <ProfileShortcutsCompact profile={profile} />
          </div>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** Your own profile, while you're a collector: the strip that keeps asking for an artist code. */
async function OwnerCodeStrip({ handle }: { handle: string }) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  return (
    <div className="mx-auto mt-6 max-w-[1184px] px-4 sm:px-6 lg:px-8">
      <CodeStrip />
    </div>
  );
}
