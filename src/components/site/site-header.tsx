import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CodesGift } from "@/components/artists/codes-gift";
import { Missions } from "@/components/artists/missions";
import { FavoritesSession } from "@/components/favorites/favorites-session";
import { MessagesMenu, MessagesSession } from "@/components/messages/messages-menu";
import { SocialSession } from "@/components/social/social-session";
import { getViewerCodeNews, getViewerProgress } from "@/lib/artists/server";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { getViewerSettings } from "@/lib/settings/server";
import { ViewerPrefs } from "@/components/settings/viewer-prefs";
import { getTeamRole } from "@/lib/admin/team";
import { AccountMenu } from "./account-menu";
import { ActivityPing } from "./activity-ping";
import { CopyLinkButton } from "./copy-link-button";
import { ExploreMenu } from "./explore-menu";
import { HeaderShell } from "./header-shell";
import { NotificationsMenu } from "./notifications-menu";
import { OrdersMenu } from "./orders-menu";
import { sinceMonth } from "@/components/notifications/time";
import { ThemeMenu } from "./theme-menu";
import { Logo } from "./logo";

type SiteHeaderProps = {
  /** Float over a full-bleed banner (profile pages). */
  overlay?: boolean;
  /** Shows `/handle` + copy-link next to the logo; a promise (the route's params) streams in on its own. */
  handle?: string | Promise<string>;
  /** Translucent once solid, so the page's color shows through. */
  frosted?: boolean;
  /** Spans a wide page (Explore's wall) instead of the usual column. */
  wide?: boolean;
};

export function SiteHeader({ overlay = false, handle, frosted = false, wide = false }: SiteHeaderProps) {
  return (
    <HeaderShell overlay={overlay} frosted={frosted}>
      <div className={`mx-auto flex h-16 items-center gap-2 px-4 ${wide ? "max-w-[1800px] lg:px-6" : "max-w-[1184px] sm:px-6"}`}>
        {/* Over a banner the wordmark turns white; the scrim keeps it legible. */}
        <div
          className={`flex min-w-0 items-center ${
            overlay
              ? "text-white [text-shadow:0_1px_8px_rgb(var(--shadow-rgb)/0.45)] group-data-[solid=true]/header:text-ink group-data-[solid=true]/header:[text-shadow:none] [&>a]:text-inherit"
              : ""
          }`}
        >
          <Logo />
          {handle && (
            <Suspense>
              <HandleCrumb handle={handle} />
            </Suspense>
          )}
        </div>

        <nav aria-label="Main" className="group/nav ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ExploreMenu />
          {/* Signed in on a phone under 440px, the order clipboard takes this spot; the theme moves to the account menu. */}
          <div className="max-[439px]:group-has-[[data-orders-menu]]/nav:hidden">
            <ThemeMenu />
          </div>
          {/* Cart, messages, commissions and notifications only exist for signed-in people; visitors get sign in / join. */}
          <Suspense fallback={<div aria-hidden className="h-10 w-24 sm:w-52" />}>
            <ViewerNav />
          </Suspense>
        </nav>
      </div>
    </HeaderShell>
  );
}

async function HandleCrumb({ handle }: { handle: string | Promise<string> }) {
  const resolved = await handle;
  return (
    <>
      <span className="truncate pl-1 font-display text-xl font-extrabold tracking-tight opacity-90">
        /{resolved}
      </span>
      <CopyLinkButton handle={resolved} />
    </>
  );
}

function CircleButton({
  label,
  className = "grid",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice [&_svg]:size-[1.125rem] ${className}`}
    >
      {children}
    </button>
  );
}

async function ViewerNav() {
  const viewer = await getViewer();
  const [profile, codes, settings, teamRole] = viewer
    ? await Promise.all([getProfile(viewer.handle), getViewerCodeNews(), getViewerSettings(), getTeamRole(viewer.id)])
    : [null, null, null, null];
  // Artists on their way to verification get their missions in the corner.
  const progress = profile?.artist && !profile.artist.verifiedAt ? await getViewerProgress() : null;

  if (!viewer || !profile) {
    return (
      <>
        <FavoritesSession viewer={null} />
        <SocialSession viewer={null} />
        <MessagesSession viewer={null} />
        <ViewerPrefs hideLikes={false} />
        <Link
          href="/sign-in"
          className="hidden h-10 items-center rounded-full bg-surface/75 px-4 text-sm font-semibold text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice sm:flex"
        >
          Sign in
        </Link>
        <Link
          href="/join"
          className="flex h-10 items-center rounded-full bg-ocean px-4 text-sm font-semibold text-white shadow-soft transition-[filter] hover:brightness-105"
        >
          <span className="sm:hidden">Join</span>
          <span className="hidden sm:inline">Create account</span>
        </Link>
      </>
    );
  }

  return (
    <>
      <FavoritesSession viewer={viewer.id} />
      <SocialSession viewer={viewer.id} />
      <MessagesSession viewer={viewer} />
      <ViewerPrefs hideLikes={settings?.hideLikeCounts ?? false} />
      {/* Once a day: "was here", for the back office's active accounts. */}
      <ActivityPing viewer={viewer.id} />
      <CircleButton label="Cart" className="hidden sm:grid">
        <ShoppingBag aria-hidden />
      </CircleButton>
      <MessagesMenu />
      {/* Commission notices, apart from the bell's likes and follows. */}
      <OrdersMenu
        viewer={viewer.id}
        owner={{ name: profile.displayName, handle: profile.handle }}
        isArtist={profile.artist !== null}
      />
      <NotificationsMenu
        viewer={viewer.id}
        owner={{ name: profile.displayName, handle: profile.handle, since: sinceMonth(profile.joinedAt) }}
      />
      <AccountMenu
        viewer={{
          handle: profile.handle,
          displayName: profile.displayName,
          avatar: profile.avatar,
          isPro: profile.plan === "pro",
          isArtist: profile.artist !== null,
          codesLeft: codes?.toGive ?? 0,
          isAdmin: teamRole === "admin",
        }}
      />
      {progress && <Missions progress={progress} />}
      {/* New artist codes: a little gift, once. */}
      {codes && codes.fresh > 0 && <CodesGift fresh={codes.fresh} reason={codes.reason} invitedBy={codes.invitedBy} />}
    </>
  );
}
