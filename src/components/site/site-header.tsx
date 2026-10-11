import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { FavoritesSession } from "@/components/favorites/favorites-session";
import { getNotifications } from "@/lib/notifications";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { AccountMenu } from "./account-menu";
import { CopyLinkButton } from "./copy-link-button";
import { ExploreMenu } from "./explore-menu";
import { HeaderShell } from "./header-shell";
import { NotificationsMenu } from "./notifications-menu";
import { ThemeMenu } from "./theme-menu";
import { Logo } from "./logo";

type SiteHeaderProps = {
  /** Float over a full-bleed banner (profile pages). */
  overlay?: boolean;
  /** Shows `/handle` + copy-link next to the logo. */
  handle?: string;
  /** Translucent once solid, so the page's color shows through. */
  frosted?: boolean;
};

export function SiteHeader({ overlay = false, handle, frosted = false }: SiteHeaderProps) {
  return (
    <HeaderShell overlay={overlay} frosted={frosted}>
      <div className="mx-auto flex h-16 max-w-[1184px] items-center gap-2 px-4 sm:px-6">
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
            <>
              <span className="truncate pl-1 font-display text-xl font-extrabold tracking-tight opacity-90">
                /{handle}
              </span>
              <CopyLinkButton handle={handle} />
            </>
          )}
        </div>

        <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ExploreMenu />
          <ThemeMenu />
          {/* Cart, messages and notifications only exist for signed-in artists; visitors get sign in / join. */}
          <Suspense fallback={<div aria-hidden className="h-10 w-24 sm:w-52" />}>
            <ViewerNav />
          </Suspense>
        </nav>
      </div>
    </HeaderShell>
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
  const profile = viewer ? await getProfile(viewer.handle) : null;

  if (!viewer || !profile) {
    return (
      <>
        <FavoritesSession viewer={null} />
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
      <CircleButton label="Cart" className="hidden sm:grid">
        <ShoppingBag aria-hidden />
      </CircleButton>
      <CircleButton label="Messages" className="hidden sm:grid">
        <MessageCircle aria-hidden />
      </CircleButton>
      <NotificationsMenu items={await getNotifications(viewer.handle)} />
      <AccountMenu
        viewer={{
          handle: profile.handle,
          displayName: profile.displayName,
          avatar: profile.avatar,
          isPro: profile.plan === "pro",
        }}
      />
    </>
  );
}
