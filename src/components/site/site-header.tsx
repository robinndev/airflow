import { Suspense, type ReactNode } from "react";
import { Bell, MessageCircle, ShoppingBag } from "lucide-react";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { AccountMenu } from "./account-menu";
import { CopyLinkButton } from "./copy-link-button";
import { ExploreMenu } from "./explore-menu";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";

type SiteHeaderProps = {
  /** Float over a full-bleed banner (profile pages). */
  overlay?: boolean;
  /** Shows `/handle` + copy-link next to the logo. */
  handle?: string;
};

export function SiteHeader({ overlay = false, handle }: SiteHeaderProps) {
  return (
    <HeaderShell overlay={overlay}>
      <div className="mx-auto flex h-16 max-w-[1184px] items-center gap-2 px-4 sm:px-6">
        {/* Over a banner the wordmark turns white; the scrim keeps it legible. */}
        <div
          className={`flex min-w-0 items-center ${
            overlay
              ? "text-white [text-shadow:0_1px_8px_rgb(23_59_91/0.45)] group-data-[solid=true]/header:text-ink group-data-[solid=true]/header:[text-shadow:none] [&>a]:text-inherit"
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

        <nav aria-label="Main" className="ml-auto flex items-center gap-2">
          <ExploreMenu />
          <CircleButton label="Cart" className="hidden sm:grid">
            <ShoppingBag aria-hidden />
          </CircleButton>
          <CircleButton label="Messages">
            <MessageCircle aria-hidden />
          </CircleButton>
          <CircleButton label="Notifications" dot>
            <Bell aria-hidden />
          </CircleButton>
          <Suspense fallback={<div className="h-10 w-[4.75rem] rounded-full bg-white/60" />}>
            <ViewerMenu />
          </Suspense>
        </nav>
      </div>
    </HeaderShell>
  );
}

function CircleButton({
  label,
  dot,
  className = "grid",
  children,
}: {
  label: string;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative size-10 place-items-center rounded-full bg-white/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-white group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice [&_svg]:size-[1.125rem] ${className}`}
    >
      {children}
      {dot && (
        <span className="absolute top-2 right-2 size-2 rounded-full bg-mint ring-2 ring-white" />
      )}
    </button>
  );
}

async function ViewerMenu() {
  const viewer = await getViewer();
  const profile = viewer ? await getProfile(viewer.handle) : null;

  return (
    <AccountMenu
      viewer={
        profile && {
          handle: profile.handle,
          displayName: profile.displayName,
          avatar: profile.avatar,
          isPro: profile.plan === "pro",
        }
      }
    />
  );
}
