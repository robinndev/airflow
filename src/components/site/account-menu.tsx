"use client";

import Link from "next/link";
import { Bookmark, Frame, LogIn, LogOut, Menu, MessageCircle, Palette, Settings, Sparkles, UserRound, Wallet } from "lucide-react";
import type { MouseEvent } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import type { ImageAsset } from "@/lib/profile/types";

type AccountMenuProps = {
  viewer: { handle: string; displayName: string; avatar: ImageAsset; isPro: boolean } | null;
};

const MENU_ID = "account-menu";

const item =
  "flex w-full items-center gap-3 rounded-input px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ice [&_svg]:size-4 [&_svg]:text-muted";

/** Native popover (top layer, light-dismiss, Esc) — no menu library needed. */
export function AccountMenu({ viewer }: AccountMenuProps) {
  // Close after choosing an item; client-side navigation keeps popovers open.
  function closeOnSelect(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a,button")) {
      document.getElementById(MENU_ID)?.hidePopover();
    }
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Account menu"
        className="flex h-10 items-center gap-1.5 rounded-full bg-surface/75 pr-3 pl-1 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice"
      >
        {viewer ? (
          <Avatar image={viewer.avatar} size={32} className="size-8" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-ice text-muted">
            <UserRound aria-hidden className="size-4" />
          </span>
        )}
        <Menu aria-hidden className="size-5" />
      </button>

      <div
        id={MENU_ID}
        popover="auto"
        onClick={closeOnSelect}
        className="fixed inset-auto top-[4.5rem] right-[max(1rem,calc((100vw-1184px)/2+1.5rem))] m-0 w-64 rounded-[20px] border border-border bg-surface p-2 text-ink shadow-lift"
      >
        {viewer ? (
          <>
            <div className="flex items-center gap-3 px-3 pt-2 pb-3">
              <Avatar image={viewer.avatar} size={40} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{viewer.displayName}</p>
                <p className="truncate text-xs text-muted">@{viewer.handle}</p>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <Link href={`/${viewer.handle}`} className={item}>
                <UserRound aria-hidden />
                Your profile
              </Link>
              <Link href="/favorites" className={item}>
                <Bookmark aria-hidden />
                Favorites
              </Link>
              <Link href="/customize" className={item}>
                <Palette aria-hidden />
                Customize profile
                {viewer.isPro && (
                  <span className="ml-auto rounded-full bg-lilac/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-lilac-ink">
                    Pro
                  </span>
                )}
              </Link>
              <Link href="/shop" className={item}>
                <Frame aria-hidden />
                Frame shop
              </Link>
              <Link href="/plans" className={item}>
                <Sparkles aria-hidden />
                Plans
                {viewer.isPro && (
                  <span className="ml-auto rounded-full bg-lilac/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-lilac-ink">
                    Flow+
                  </span>
                )}
              </Link>
              {/* Messages lives in the header on larger screens. */}
              <button type="button" className={`${item} sm:hidden`}>
                <MessageCircle aria-hidden />
                Messages
              </button>
              <button type="button" className={item}>
                <Wallet aria-hidden />
                Orders & earnings
              </button>
              <button type="button" className={item}>
                <Settings aria-hidden />
                Settings
              </button>
            </div>
            <form action={signOut} className="mt-2 border-t border-border pt-2">
              <button type="submit" className={item}>
                <LogOut aria-hidden />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/sign-in" className={item}>
              <LogIn aria-hidden />
              Sign in
            </Link>
            <Link href="/join" className={item}>
              <UserRound aria-hidden />
              Create an account
            </Link>
          </>
        )}
      </div>
    </>
  );
}
