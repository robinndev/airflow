"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { AdoptCard, PaletteDots } from "@/components/explore/adopt-card";
import { Stamp } from "@/components/explore/stamp";
import { openChat } from "@/components/messages/store";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ADOPT_STATUS } from "@/lib/listings/catalog";
import { formatUsdExact } from "@/lib/format";
import type { Adoptable, ImageAsset } from "@/lib/profile/types";

type Artist = { handle: string; name: string; avatar: ImageAsset };

/**
 * An artist's ready-made characters, hang-tagged, and the sheet each one
 * opens: the art, what comes with it, the price, and how adopting works.
 * Ready-made means no request and no quote: whoever pays first adopts it.
 * Checkout isn't open yet, so the button says so (never a fake charge).
 * Opens from a card or a link to /{handle}/adoptables#<id>.
 */
export function AdoptShelf({ artist, adoptables }: { artist: Artist; adoptables: Adoptable[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shown, setShown] = useState(0);

  const open = useCallback(
    (id: string) => {
      if (!adoptables.some((a) => a.id === id)) return;
      setActiveId(id);
      setShown(0);
      history.replaceState(null, "", `#${id}`);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    },
    [adoptables],
  );

  // A link to /{handle}/adoptables#<id> opens that one, once the page is up.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const frame = requestAnimationFrame(() => open(hash));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // The cards are plain links to #id; open the sheet instead of jumping.
  function onCardClick(event: MouseEvent, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    if ((event.target as HTMLElement).closest("a")) {
      event.preventDefault();
      open(id);
    }
  }

  const adopt = adoptables.find((a) => a.id === activeId);

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-4 sm:gap-x-5 md:grid-cols-3">
        {adoptables.map((a) => (
          <li key={a.id} id={a.id} className="scroll-mt-24" onClickCapture={(e) => onCardClick(e, a.id)}>
            <AdoptCard
              adopt={{
                id: a.id,
                name: a.name,
                species: a.species,
                image: a.images[0],
                artist: { ...artist, href: `/${artist.handle}` },
                sale: { type: "flat", priceUsd: a.priceUsd },
                status: a.status === "sold" ? "adopted" : a.status,
                href: `#${a.id}`,
              }}
            />
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={adopt ? `${adopt.name}, ready-made` : "Adoptable"}
        onClose={() => {
          history.replaceState(null, "", window.location.pathname + window.location.search);
          setActiveId(null);
        }}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-surface p-0 text-ink outline-none backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] open:flex sm:m-auto sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[min(60rem,calc(100vw-3rem))] sm:rounded-[28px] sm:shadow-lift"
      >
        {adopt && (
          <div className="relative grid min-h-0 w-full overflow-y-auto md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:overflow-hidden">
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="absolute top-4 left-4 z-10 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur-sm"
            >
              <X aria-hidden className="size-5" />
            </button>

            <div className="bg-canvas p-5 pt-16 md:overflow-y-auto md:p-8 md:pt-16">
              <div
                className="relative overflow-hidden rounded-[18px] bg-ice"
                style={{ aspectRatio: `${adopt.images[shown].width} / ${adopt.images[shown].height}`, backgroundColor: adopt.images[shown].palette?.[0] }}
              >
                <Image
                  src={adopt.images[shown].src}
                  alt={adopt.images[shown].alt}
                  fill
                  sizes="(min-width: 768px) 30rem, 100vw"
                  className={`object-contain ${adopt.status === "sold" ? "saturate-50" : ""}`}
                />
                {adopt.status === "sold" && (
                  <span className="absolute inset-0 grid place-items-center bg-scrim/20">
                    <Stamp tone="like" onPaper className="-rotate-12 bg-paper/90 px-3 py-1.5 text-sm">
                      Adopted ♥
                    </Stamp>
                  </span>
                )}
              </div>
              {adopt.images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {adopt.images.map((image, i) => (
                    <button
                      key={image.src}
                      type="button"
                      aria-label={`Picture ${i + 1}`}
                      aria-pressed={i === shown}
                      onClick={() => setShown(i)}
                      className="relative size-16 overflow-hidden rounded-[10px] bg-ice ring-2 ring-transparent aria-pressed:ring-ocean"
                    >
                      <Image src={image.src} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <AdoptDetails adopt={adopt} artist={artist} onClose={() => dialogRef.current?.close()} />
          </div>
        )}
      </dialog>
    </>
  );
}

function AdoptDetails({ adopt, artist, onClose }: { adopt: Adoptable; artist: Artist; onClose: () => void }) {
  const router = useRouter();
  const sold = adopt.status === "sold";
  const firstName = artist.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8 md:overflow-y-auto md:pt-16">
      <header>
        <p className="inline-flex items-center gap-2 text-[0.6875rem] font-bold tracking-[0.14em] text-lilac-ink uppercase">
          Ready-made · {ADOPT_STATUS[adopt.status].label}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight">{adopt.name}</h2>
          <PaletteDots colors={adopt.images[0].palette} />
        </div>
        {adopt.species && <p className="mt-1 text-muted">{adopt.species}</p>}
        <p className="mt-4 font-display text-[1.75rem] leading-none font-extrabold text-accent-strong">{formatUsdExact(adopt.priceUsd)}</p>
        <p className="mt-1 text-sm text-muted">Fixed price · one owner</p>
      </header>

      {adopt.description && <p className="text-[0.9375rem] leading-relaxed text-ink/85">{adopt.description}</p>}

      {adopt.includes.length > 0 && (
        <section aria-label="Comes with">
          <h3 className="text-xs font-bold tracking-wider text-muted uppercase">Comes with</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {adopt.includes.map((item) => (
              <li key={item} className="inline-flex items-center gap-1 rounded-full bg-ice px-2.5 py-1 text-xs font-medium text-ink/85">
                <Check aria-hidden className="size-3 text-mint-strong" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ready-made, not a commission: say how it works before anyone pays. */}
      <ol aria-label="How adopting works" className="grid gap-2 rounded-[16px] border border-dashed border-border p-4 text-sm">
        {[
          ["Pay the price", "No request, no quote: it's already drawn."],
          ["It's yours", `${firstName} sends the files and passes the character to you.`],
          ["Credit stays", `${firstName} stays credited as the designer.`],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-lilac/15 font-display text-xs font-extrabold text-lilac-ink">
              {i + 1}
            </span>
            <span>
              <span className="font-semibold text-ink">{title}.</span> <span className="text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto grid gap-3">
        {sold ? (
          <p className="rounded-[14px] bg-ice px-4 py-3 text-sm text-muted">{adopt.name} already has a new home.</p>
        ) : (
          <button type="button" disabled className={buttonClasses({ size: "lg", className: "h-12 w-full" })}>
            {adopt.status === "reserved" ? "On hold for someone" : `Adopt for ${formatUsdExact(adopt.priceUsd)} · checkout opens soon`}
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar image={{ ...artist.avatar, alt: "" }} size={36} className="size-9" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">
            Designed by <span className="font-semibold text-ink">{artist.name}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (!openChat(artist.handle)) router.push(`/sign-in?next=${encodeURIComponent(`/${artist.handle}/adoptables#${adopt.id}`)}`);
            }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <MessageCircle aria-hidden />
            Ask {firstName}
          </button>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-mint-strong" />
          Pay on Artiflow only. Anyone asking you to pay elsewhere isn&apos;t protected by us.
        </p>
      </div>
    </div>
  );
}
