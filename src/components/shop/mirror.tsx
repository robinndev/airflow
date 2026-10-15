import Image from "next/image";
import { Sticker } from "@/components/about/stickers";
import { FramedAvatar } from "@/components/frames/avatar-frame";
import type { ImageAsset } from "@/lib/profile/types";
import { STICKER_PACKS, type PackId, type Worn } from "@/lib/shop/catalog";
import { CoverEffect } from "./fx/cover-effect";
import { NameFx } from "./fx/name-fx";
import { Pin } from "./fx/pin";
import { ProfileEffect } from "./fx/profile-effect";

/*
 * The fitting mirror: a little version of your profile behind arched glass,
 * wearing whatever you're trying on (frame, effect, animated name and cover,
 * pin). A sticker pack you're looking at gets stuck to the glass.
 */

export type MirrorSubject = { displayName: string; handle: string | null; avatar: ImageAsset | null; banner: ImageAsset | null };

export function Mirror({ subject, trying, stickers }: { subject: MirrorSubject; trying: Worn; stickers: PackId | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[19rem]">
      {/* The frame: turned wood with a brass inner edge. */}
      <div className="rounded-t-[999px] rounded-b-[26px] bg-shelf p-2.5 shadow-lift">
        <div className="rounded-t-[999px] rounded-b-[20px] bg-shelf-edge p-[3px]">
          <div data-testid="mirror" className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[17px] bg-canvas">
            {/* Cover */}
            <div className="relative h-[42%] overflow-hidden bg-[linear-gradient(135deg,var(--sky),var(--lilac)_55%,var(--mint))]">
              {subject.banner && (
                <Image src={subject.banner.src} alt="" fill sizes="300px" className="object-cover" style={{ objectPosition: subject.banner.focus ?? "50% 50%" }} />
              )}
              <CoverEffect id={trying.coverFx} />
            </div>
            {/* Picture, name, a few lines of profile */}
            <div className="relative -mt-11 flex flex-col items-center px-5 text-center">
              <FramedAvatar frame={trying.frame}>
                {subject.avatar ? (
                  <Image src={subject.avatar.src} alt="" width={88} height={88} className="size-[5.5rem] rounded-full bg-ice object-cover ring-4 ring-canvas" />
                ) : (
                  <span className="block size-[5.5rem] rounded-full bg-gradient-to-br from-sky to-lilac ring-4 ring-canvas" />
                )}
              </FramedAvatar>
              <p className="mt-4 flex max-w-full items-center gap-1.5 font-display text-xl leading-tight font-extrabold text-ink">
                <span className="truncate">
                  <NameFx fx={trying.nameFx} text={subject.displayName} />
                </span>
                <Pin id={trying.pin} size={22} />
              </p>
              {subject.handle && <p className="text-sm text-muted">@{subject.handle}</p>}
              <span aria-hidden className="mt-3 h-2 w-4/5 rounded-full bg-border" />
              <span aria-hidden className="mt-1.5 h-2 w-3/5 rounded-full bg-border" />
              <span aria-hidden className="mt-3 flex gap-1.5">
                <span className="h-5 w-14 rounded-full bg-ice" />
                <span className="h-5 w-10 rounded-full bg-ice" />
              </span>
            </div>
            <ProfileEffect id={trying.effect} count={12} />
            {/* The glass: a soft reflection across it. */}
            <span aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(120deg,transparent_30%,rgb(255_255_255/0.16)_38%,transparent_46%,transparent_60%,rgb(255_255_255/0.1)_64%,transparent_68%)]" />
          </div>
        </div>
      </div>
      {stickers && (
        <>
          <span aria-hidden className="absolute top-[38%] -left-3 z-40 size-14 -rotate-12 drop-shadow-md">
            <Sticker id={STICKER_PACKS[stickers][0]} color="#ff6fa5" />
          </span>
          <span aria-hidden className="absolute -right-2 bottom-16 z-40 size-12 rotate-[14deg] drop-shadow-md">
            <Sticker id={STICKER_PACKS[stickers][1]} color="#4fc3f7" />
          </span>
        </>
      )}
    </div>
  );
}
