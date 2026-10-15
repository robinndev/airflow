"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Minus, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import {
  adjustServiceSlots,
  deleteAdoptable,
  deleteService,
  moveAdoptable,
  moveService,
  pauseAllServices,
  setAdoptableStatus,
  setServiceStatus,
  type StudioResult,
} from "@/app/(site)/studio/actions";
import { AdoptCard } from "@/components/explore/adopt-card";
import { HandNote } from "@/components/explore/doodles";
import { showToast } from "@/components/favorites/toast-events";
import { ServiceSheet } from "@/components/listings/service-sheet";
import { buttonClasses } from "@/components/ui/button";
import type { AdoptStatus } from "@/lib/listings/catalog";
import {
  NEW_ADOPTABLE,
  NEW_SERVICE,
  adoptableDraft,
  serviceDraft,
  type AdoptableDraft,
  type ServiceDraft,
} from "@/lib/listings/editable";
import type { Adoptable, CommissionService, CommissionStatus, ImageAsset } from "@/lib/profile/types";
import { ADOPT_STATUS_OPTIONS, AdoptableEditor } from "./adoptable-editor";
import { Segmented } from "./fields";
import { ServiceEditor } from "./service-editor";

type Artist = { handle: string; name: string; avatar: ImageAsset };

const STATUS_OPTIONS = [
  { value: "open" as const, label: "Open", dot: "bg-mint-dot" },
  { value: "waitlist" as const, label: "Waitlist", dot: "bg-lilac" },
  { value: "closed" as const, label: "Closed", dot: "bg-muted" },
];

const STATUS_WORD: Record<CommissionStatus, string> = { open: "open", waitlist: "on waitlist", closed: "closed" };
const ADOPT_WORD: Record<AdoptStatus, string> = { available: "available", reserved: "on hold", sold: "adopted" };

/**
 * Runs a studio action, then says how it went (with Undo when there is one).
 * A close or delete the rule refused goes to `onBlocked` (shown on the sheet)
 * instead of a toast; a note from the server replaces the success message.
 */
function useStudioAction(onBlocked?: (why: string) => void) {
  const [pending, start] = useTransition();
  function run(action: () => Promise<StudioResult>, message?: string, undo?: () => Promise<StudioResult>) {
    start(async () => {
      const result = await action();
      if (!result.ok) {
        if (result.blocked && onBlocked) onBlocked(result.error);
        else showToast({ message: result.error });
      } else if (result.note || message) showToast({ message: result.note ?? message!, undo: undo && (() => void undo()) });
    });
  }
  return [pending, run] as const;
}

/**
 * The artist's own listings, both kinds: commission sheets pinned up (made to
 * order) and hang-tagged characters (ready-made). Status is one click on each;
 * the editors open on top.
 */
export function StudioDesk({ artist, services, adoptables }: { artist: Artist; services: CommissionService[]; adoptables: Adoptable[] }) {
  const [serviceEdit, setServiceEdit] = useState<{ draft: ServiceDraft; taken: number } | null>(null);
  const [adoptEdit, setAdoptEdit] = useState<AdoptableDraft | null>(null);
  const [pausing, run] = useStudioAction();
  const paused = services.some((s) => s.paused);
  const taking = services.some((s) => s.status !== "closed");

  return (
    <>
      <section aria-labelledby="made-to-order" className="mt-14">
        <ShelfHeading
          id="made-to-order"
          kicker="Made to order"
          title="Commission sheets"
          hint="They request, you quote, they pay, you draw it."
        >
          {services.length > 0 && (paused || taking) && (
            <button
              type="button"
              disabled={pausing}
              onClick={() =>
                run(
                  () => pauseAllServices(!paused),
                  paused ? "Commissions back as they were" : "All commissions paused",
                  () => pauseAllServices(paused),
                )
              }
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {paused ? "Resume commissions" : "Pause all"}
            </button>
          )}
          <button type="button" onClick={() => setServiceEdit({ draft: { ...NEW_SERVICE }, taken: 0 })} className={buttonClasses({ size: "sm" })}>
            <Plus aria-hidden />
            New service
          </button>
        </ShelfHeading>

        {services.length === 0 ? (
          <EmptyShelf
            note="your first sheet ✎"
            title="Put up your first commission sheet"
            text="Examples, a price for each package (sketch, lineart, full color), a turnaround and how many slots you'll take."
            action={
              <button type="button" onClick={() => setServiceEdit({ draft: { ...NEW_SERVICE }, taken: 0 })} className={buttonClasses()}>
                <Plus aria-hidden />
                New service
              </button>
            }
          />
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service, i) => (
              <li key={service.id}>
                <ServiceOnShelf
                  service={service}
                  artist={artist}
                  first={i === 0}
                  last={i === services.length - 1}
                  onEdit={() => setServiceEdit({ draft: serviceDraft(service), taken: service.slots?.taken ?? 0 })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ready-made" className="mt-24">
        <ShelfHeading id="ready-made" kicker="Ready-made" title="Adoptables" hint="Already drawn. Fixed price; whoever pays first adopts it.">
          <button type="button" onClick={() => setAdoptEdit({ ...NEW_ADOPTABLE })} className={buttonClasses({ size: "sm" })}>
            <Plus aria-hidden />
            New adoptable
          </button>
        </ShelfHeading>

        {adoptables.length === 0 ? (
          <EmptyShelf
            note="hang a tag on it ♡"
            title="Find a home for a character"
            text="Upload the design, name it, price it. Buyers pay and it's theirs: no request, no quote."
            action={
              <button type="button" onClick={() => setAdoptEdit({ ...NEW_ADOPTABLE })} className={buttonClasses()}>
                <Plus aria-hidden />
                New adoptable
              </button>
            }
          />
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {adoptables.map((adoptable, i) => (
              <li key={adoptable.id}>
                <AdoptOnShelf
                  adoptable={adoptable}
                  artist={artist}
                  first={i === 0}
                  last={i === adoptables.length - 1}
                  onEdit={() => setAdoptEdit(adoptableDraft(adoptable))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ServiceEditor
        draft={serviceEdit?.draft ?? null}
        taken={serviceEdit?.taken}
        artist={artist}
        onClose={() => setServiceEdit(null)}
      />
      <AdoptableEditor draft={adoptEdit} artist={artist} onClose={() => setAdoptEdit(null)} />
    </>
  );
}

function ShelfHeading({ id, kicker, title, hint, children }: { id: string; kicker: string; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-4">
      <div>
        <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">{kicker}</p>
        <h2 id={id} className="mt-1 font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function EmptyShelf({ note, title, text, action }: { note: string; title: string; text: string; action: ReactNode }) {
  return (
    <div className="grain relative mt-8 grid place-items-center rounded-[24px] border-2 border-dashed border-border bg-surface/60 px-6 py-14 text-center">
      <HandNote className="-rotate-3 text-2xl">{note}</HandNote>
      <p className="mt-2 font-display text-xl font-extrabold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{text}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

function ServiceOnShelf({
  service,
  artist,
  first,
  last,
  onEdit,
}: {
  service: CommissionService;
  artist: Artist;
  first: boolean;
  last: boolean;
  onEdit: () => void;
}) {
  // Closing or deleting is refused while commissions on it are still open: say so right here, on the sheet.
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, run] = useStudioAction(setBlocked);
  const [status, setOptimistic] = useOptimistic(service.status ?? "open");
  const slots = service.slots ?? null;

  function changeStatus(next: CommissionStatus) {
    const before = status;
    run(
      async () => {
        setOptimistic(next);
        return setServiceStatus(service.id, next);
      },
      `${service.title} is ${STATUS_WORD[next]}`,
      () => setServiceStatus(service.id, before),
    );
  }

  return (
    <ServiceSheet
      service={service}
      status={status}
      slots={slots}
      href={`/${artist.handle}/commissions#${service.id}`}
      footer={
        <div className="relative z-10 grid gap-3 border-t border-dashed border-border pt-3" aria-busy={pending}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented label={`${service.title} status`} size="sm" value={status} onChange={changeStatus} options={STATUS_OPTIONS} />
            {slots ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-1 py-0.5 text-xs font-semibold text-ink">
                <button
                  type="button"
                  aria-label="Free a slot"
                  disabled={pending || slots.taken === 0}
                  onClick={() => run(() => adjustServiceSlots(service.id, -1), "Freed a slot")}
                  className="grid size-6 place-items-center rounded-full hover:bg-ice disabled:opacity-30"
                >
                  <Minus aria-hidden className="size-3.5" />
                </button>
                <span className="tabular-nums" title="Slots taken">
                  {slots.taken}/{slots.total} taken
                </span>
                <button
                  type="button"
                  aria-label="Take a slot"
                  disabled={pending || slots.taken >= slots.total}
                  onClick={() => run(() => adjustServiceSlots(service.id, 1), "Took a slot")}
                  className="grid size-6 place-items-center rounded-full hover:bg-ice disabled:opacity-30"
                >
                  <Plus aria-hidden className="size-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-xs text-muted">No slot limit</span>
            )}
          </div>
          {service.paused && <p className="text-xs font-semibold text-lilac-ink">Paused. It comes back as it was when you resume.</p>}
          {blocked && <StaysOpen why={blocked} onDismiss={() => setBlocked(null)} />}
          <ItemTools
            name={service.title}
            first={first}
            last={last}
            onEdit={onEdit}
            onMove={(d) => run(() => moveService(service.id, d))}
            onDelete={() => run(() => deleteService(service.id), `Deleted ${service.title}`)}
            view={`/${artist.handle}/commissions#${service.id}`}
            disabled={pending}
          />
        </div>
      }
    />
  );
}

/** Why the sheet can't close or go yet, pinned to it like a note, with the way to its open commissions. */
function StaysOpen({ why, onDismiss }: { why: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="relative -rotate-[0.6deg] rounded-[4px] bg-paper px-3.5 pt-3 pb-2.5 text-sm text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_8px_18px_-10px_rgb(var(--shadow-rgb)/0.4)]">
      <span aria-hidden className="absolute -top-2 left-4 h-4 w-10 -rotate-6 bg-star/50 [clip-path:polygon(0_8%,100%_0,96%_50%,100%_100%,0_92%,4%_50%)]" />
      <p className="font-semibold">Still in the works</p>
      <p className="mt-0.5 leading-snug text-paper-muted">{why}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] font-semibold">
        <Link href="/commissions?tab=attention" className="text-ocean-ink underline-offset-4 hover:underline dark:text-ocean">
          See them in My commissions
        </Link>
        <button type="button" onClick={onDismiss} className="text-paper-muted hover:text-on-paper">
          Got it
        </button>
      </div>
    </div>
  );
}

function AdoptOnShelf({
  adoptable,
  artist,
  first,
  last,
  onEdit,
}: {
  adoptable: Adoptable;
  artist: Artist;
  first: boolean;
  last: boolean;
  onEdit: () => void;
}) {
  const [pending, run] = useStudioAction();
  const [status, setOptimistic] = useOptimistic(adoptable.status);

  function changeStatus(next: AdoptStatus) {
    const before = status;
    run(
      async () => {
        setOptimistic(next);
        return setAdoptableStatus(adoptable.id, next);
      },
      `${adoptable.name} is ${ADOPT_WORD[next]}`,
      () => setAdoptableStatus(adoptable.id, before),
    );
  }

  return (
    <div className="grid gap-3" aria-busy={pending}>
      <AdoptCard
        adopt={{
          id: adoptable.id,
          name: adoptable.name,
          species: adoptable.species,
          image: adoptable.images[0],
          artist: { ...artist, href: `/${artist.handle}` },
          sale: { type: "flat", priceUsd: adoptable.priceUsd },
          status: status === "sold" ? "adopted" : status,
          href: `/${artist.handle}/adoptables#${adoptable.id}`,
        }}
      />
      <Segmented label={`${adoptable.name} status`} size="sm" value={status} onChange={changeStatus} options={ADOPT_STATUS_OPTIONS} />
      <ItemTools
        name={adoptable.name}
        first={first}
        last={last}
        onEdit={onEdit}
        onMove={(d) => run(() => moveAdoptable(adoptable.id, d))}
        onDelete={() => run(() => deleteAdoptable(adoptable.id), `Deleted ${adoptable.name}`)}
        view={`/${artist.handle}/adoptables#${adoptable.id}`}
        disabled={pending}
      />
    </div>
  );
}

/** Edit, reorder, view and delete (delete asks once more, in place). */
function ItemTools({
  name,
  first,
  last,
  onEdit,
  onMove,
  onDelete,
  view,
  disabled,
}: {
  name: string;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  view: string;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const icon = "grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink disabled:opacity-30";
  return (
    <div className="relative z-10 flex items-center gap-0.5">
      <button type="button" onClick={onEdit} className={buttonClasses({ variant: "secondary", size: "sm", className: "mr-1" })}>
        <Pencil aria-hidden />
        Edit
      </button>
      <button type="button" aria-label={`Move ${name} earlier`} disabled={disabled || first} onClick={() => onMove(-1)} className={icon}>
        <ArrowUp aria-hidden className="size-4" />
      </button>
      <button type="button" aria-label={`Move ${name} later`} disabled={disabled || last} onClick={() => onMove(1)} className={icon}>
        <ArrowDown aria-hidden className="size-4" />
      </button>
      <Link href={view} aria-label={`See ${name} as buyers do`} className={icon}>
        <ExternalLink aria-hidden className="size-4" />
      </Link>
      {confirming ? (
        <span className="ml-auto inline-flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setConfirming(false);
              onDelete();
            }}
            className="h-8 rounded-full bg-danger px-3 text-xs font-bold text-white"
          >
            Delete for good
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-full px-2 text-xs font-semibold text-muted hover:text-ink">
            Keep
          </button>
        </span>
      ) : (
        <button type="button" aria-label={`Delete ${name}`} disabled={disabled} onClick={() => setConfirming(true)} className={`${icon} ml-auto hover:text-danger`}>
          <Trash2 aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
