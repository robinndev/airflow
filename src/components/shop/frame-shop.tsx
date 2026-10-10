"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LoaderCircle, Lock, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { equipFrame } from "@/app/(site)/customize/actions";
import { FrameArt, FramedAvatar } from "@/components/frames/avatar-frame";
import { buttonClasses } from "@/components/ui/button";
import { FRAMES, formatFramePrice, type Frame, type FrameId } from "@/lib/frames";
import type { ImageAsset } from "@/lib/profile/types";

const RARITY: Record<Frame["rarity"], { label: string; chip: string; glow: string }> = {
  common: { label: "Common", chip: "bg-ice text-muted", glow: "from-ice to-surface" },
  rare: { label: "Rare", chip: "bg-sky/15 text-sky-ink", glow: "from-sky/25 to-surface" },
  epic: { label: "Epic", chip: "bg-lilac/15 text-lilac-ink", glow: "from-lilac/30 to-surface" },
  legendary: { label: "Legendary", chip: "bg-star/20 text-ink", glow: "from-star/35 via-like/15 to-surface" },
};

/**
 * The frame shop: pick a frame to try it on in the fitting room, wear free
 * ones right away, and see what the paid ones will cost once checkout opens.
 */
export function FrameShop({
  viewer,
  owned,
  equipped,
}: {
  viewer: { handle: string; displayName: string; avatar: ImageAsset } | null;
  owned: string[];
  equipped: string | null;
}) {
  const [trying, setTrying] = useState<FrameId>((equipped as FrameId) ?? "sakura");
  const [wearing, setWearing] = useState(equipped);
  const [ownedNow, setOwnedNow] = useState(owned);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const frame = FRAMES.find((f) => f.id === trying)!;
  const have = frame.priceUsd === 0 || ownedNow.includes(frame.id);

  function wear(id: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await equipFrame(id);
      if (!res.ok) return setError(res.error);
      setWearing(id);
      if (id && !ownedNow.includes(id)) setOwnedNow([...ownedNow, id]);
    });
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Fitting room */}
      <section
        aria-label="Fitting room"
        className="overflow-hidden rounded-panel border border-border bg-surface shadow-lift lg:sticky lg:top-24"
      >
        <div className={`relative grid place-items-center bg-gradient-to-b ${RARITY[frame.rarity].glow} px-6 pt-12 pb-10`}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <FramedAvatar key={frame.id} frame={frame.id}>
            {viewer ? (
              <Image src={viewer.avatar.src} alt="" width={160} height={160} className="size-36 rounded-full bg-ice object-cover shadow-lift ring-4 ring-surface" />
            ) : (
              <span className="grid size-36 place-items-center rounded-full bg-gradient-to-br from-sky to-lilac font-display text-5xl font-extrabold text-white shadow-lift ring-4 ring-surface">
                ?
              </span>
            )}
          </FramedAvatar>
          <p className="mt-8 font-display text-lg font-extrabold text-ink">{viewer?.displayName ?? "You"}</p>
          {viewer && <p className="text-sm text-muted">@{viewer.handle}</p>}
        </div>

        <div className="border-t border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">{frame.name}</h2>
              <p className="mt-0.5 text-sm text-muted">{frame.blurb}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${RARITY[frame.rarity].chip}`}>
              {RARITY[frame.rarity].label}
            </span>
          </div>

          <div className="mt-5 grid gap-2">
            {!viewer ? (
              <Link href="/sign-in?next=/shop" className={buttonClasses({ size: "lg", className: "w-full" })}>
                Sign in to collect frames
              </Link>
            ) : wearing === frame.id ? (
              <>
                <p className="flex h-11 items-center justify-center gap-2 rounded-action bg-mint/15 text-sm font-semibold text-mint-ink">
                  <Check aria-hidden className="size-4" />
                  You&apos;re wearing this
                </p>
                <button type="button" onClick={() => wear(null)} disabled={pending} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                  Take it off
                </button>
              </>
            ) : have ? (
              <button type="button" onClick={() => wear(frame.id)} disabled={pending} className={buttonClasses({ size: "lg", className: "w-full" })}>
                {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
                {frame.priceUsd === 0 && !ownedNow.includes(frame.id) ? "Claim free & wear it" : "Wear it"}
              </button>
            ) : (
              <>
                <button type="button" disabled className={buttonClasses({ size: "lg", className: "w-full" })}>
                  <Lock aria-hidden />
                  {formatFramePrice(frame)} · checkout opens soon
                </button>
                <p className="text-center text-xs text-muted">Try it on as much as you like — buying opens with payments.</p>
              </>
            )}
            {error && (
              <p role="alert" className="text-center text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Shelf */}
      <div>
        {(["common", "rare", "epic", "legendary"] as const).map((rarity) => {
          const frames = FRAMES.filter((f) => f.rarity === rarity);
          return (
            <section key={rarity} aria-labelledby={`shelf-${rarity}`} className="mb-10 last:mb-0">
              <h2 id={`shelf-${rarity}`} className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                {RARITY[rarity].label}
                <span className="text-sm font-medium text-muted">
                  {rarity === "common" ? "Free for everyone" : `from ${formatFramePrice(frames[0])}`}
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {frames.map((f) => {
                  const isOwned = f.priceUsd === 0 || ownedNow.includes(f.id);
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        aria-pressed={trying === f.id}
                        onClick={() => setTrying(f.id)}
                        className={`group relative flex w-full flex-col items-center overflow-hidden rounded-card border border-border bg-gradient-to-b ${RARITY[rarity].glow} px-3 pt-8 pb-4 text-center transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-lift aria-pressed:border-ocean aria-pressed:shadow-[0_0_0_2px_var(--ocean)]`}
                      >
                        <span className="relative grid size-20 place-items-center">
                          {viewer ? (
                            <Image src={viewer.avatar.src} alt="" width={80} height={80} className="size-20 rounded-full bg-ice object-cover" />
                          ) : (
                            <span className="size-20 rounded-full bg-gradient-to-br from-ice-strong to-ice" />
                          )}
                          <FrameArt frame={f.id} />
                        </span>
                        <span className="mt-6 font-display text-sm font-bold text-ink">{f.name}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs">
                          {wearing === f.id ? (
                            <span className="font-semibold text-mint-ink">Wearing</span>
                          ) : isOwned ? (
                            <span className="font-semibold text-muted">{f.priceUsd === 0 ? "Free" : "Owned"}</span>
                          ) : (
                            <span className="font-bold text-ink">{formatFramePrice(f)}</span>
                          )}
                          {f.animated && <span className="rounded-full bg-surface/80 px-1.5 text-[0.625rem] font-semibold text-muted">Animated</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
