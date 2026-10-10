import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileShortcutsCompact, ProfileSidebar } from "@/components/profile/profile-sidebar";
import { ProfileSkeleton } from "@/components/profile/skeletons";
import { SiteHeader } from "@/components/site/site-header";
import { appearanceStyle, resolveAppearance } from "@/lib/profile/appearance";
import { getFeaturedHandles, getProfile, normalizeHandle } from "@/lib/profile/queries";

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
    <div className="pb-24">
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
  const sidebarRight = appearance.sidebarPosition === "right";

  return (
    <div style={appearanceStyle(appearance)}>
      <SiteHeader overlay handle={profile.handle} />
      <ProfileHero profile={profile} appearance={appearance} />

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
  );
}
