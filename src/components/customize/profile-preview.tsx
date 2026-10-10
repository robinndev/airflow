"use client";

import Image from "next/image";
import { Brush, Heart, MessageCircle, Plus } from "lucide-react";
import { FramedAvatar } from "@/components/frames/avatar-frame";
import { buttonClasses } from "@/components/ui/button";
import type { Customization } from "@/lib/customization/model";
import { canvasData, canvasStyle, nameStyle } from "@/lib/customization/style";
import type { ImageAsset } from "@/lib/profile/types";

export type PreviewProfile = {
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  avatar: ImageAsset;
  banner: ImageAsset;
};

/**
 * The top of the profile, live: same canvas variables, name style, frame and
 * (scoped) custom CSS the real page uses — so what you see is what visitors get.
 * Custom CSS is only checked when saving; the preview applies it as typed.
 */
export function ProfilePreview({ profile, custom }: { profile: PreviewProfile; custom: Customization }) {
  const name = nameStyle(custom);
  const scope = `preview-${profile.handle}`;

  return (
    <div
      data-profile-canvas={scope}
      {...canvasData(custom)}
      style={canvasStyle(custom)}
      className="overflow-hidden rounded-panel border border-border shadow-lift"
    >
      {custom.css && (
        <style>{`@scope ([data-profile-canvas="${scope}"]) {\n${custom.css.replace(/<\/?style/gi, "")}\n}`}</style>
      )}
      <div className="relative h-36 overflow-hidden bg-ice sm:h-44" style={{ backgroundColor: profile.banner.palette?.[0] }}>
        <Image src={profile.banner.src} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
      </div>

      <div className="px-5 pb-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <FramedAvatar frame={custom.frame} className="-mt-12 w-fit">
              <Image
                src={profile.avatar.src}
                alt=""
                width={112}
                height={112}
                className="size-24 rounded-full bg-ice object-cover shadow-lift ring-4 ring-surface sm:size-28"
              />
            </FramedAvatar>
            <div className="min-w-0 pb-1">
              <p
                style={name.style}
                className={`font-display text-[calc(1.6rem*var(--name-scale,1))] leading-tight font-extrabold tracking-tight text-ink ${name.className}`}
              >
                {profile.displayName}
              </p>
              <p className="text-sm text-muted">@{profile.handle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={buttonClasses({ size: "sm" })}>
              <Plus aria-hidden />
              Follow
            </span>
            <span className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <MessageCircle aria-hidden />
              Message
            </span>
            <span className={buttonClasses({ variant: "soft", size: "sm" })}>Commission</span>
          </div>
        </div>

        <p className="mt-4 font-display font-semibold text-ink">{profile.headline}</p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/80">{profile.bio || "Your bio goes here."}</p>

        <div className={`mt-5 grid gap-4 ${custom.layout.sidebar === "right" ? "sm:grid-cols-[1fr_200px]" : "sm:grid-cols-[200px_1fr]"}`}>
          <div className={`rounded-card border border-border bg-surface p-4 shadow-soft ${custom.layout.sidebar === "right" ? "sm:order-last" : ""}`}>
            <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
              <span className="grid size-6 place-items-center rounded-[7px] bg-ice text-accent-strong [&_svg]:size-3">
                <Brush aria-hidden />
              </span>
              Commissions
            </p>
            <p className="mt-2 text-xs text-muted">Open · 3/5 slots</p>
            <span className={buttonClasses({ size: "sm", className: "mt-3 w-full" })}>Request</span>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-sm text-ink">New piece is up! Thank you all for 1k ♡</p>
            <div className="mt-3 h-20 rounded-input bg-ice" />
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
              <Heart aria-hidden className="size-3.5 text-like" /> 128
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
