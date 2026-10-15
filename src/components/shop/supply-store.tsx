"use client";

import Link from "next/link";
import { Check, Gift, LoaderCircle, Lock, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { claimMonthlyPick, wearItem } from "@/app/(site)/shop/actions";
import { HandNote } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";
import {
  KINDS,
  KIND_ORDER,
  WORN_FIELD,
  formatItemPrice,
  itemKey,
  itemOf,
  itemsOf,
  type ItemKind,
  type PackId,
  type ShopItem,
  type Worn,
} from "@/lib/shop/catalog";
import { Canvases, InkBottles, Jars, Pegboard, PinBoard, PriceTag, StickerSheets, type DisplayProps, type Tag } from "./displays";
import { Mirror, type MirrorSubject } from "./mirror";

/*
 * Artiflow Supply Co.: the shop as an art-supply store. Aisles of products
 * (pegboard, jars, inks, canvases, sticker sheets, pins); picking one tries
 * it on in the mirror, along with everything else you're trying. Free items
 * are taken in one click, paid ones wait on checkout, and Flow+ members take
 * one paid item a month on the house.
 */

export type StoreViewer = MirrorSubject & { handle: string };

type Props = {
  viewer: StoreViewer | null;
  owned: string[];
  worn: Worn;
  flowPlus: boolean;
  /** This month's Flow+ pick, if it's been taken. */
  pick: string | null;
  /** "November 1": when the next pick comes. */
  nextPick: string;
};

const DISPLAYS: Record<ItemKind, (props: DisplayProps) => ReactNode> = {
  frame: Pegboard,
  effect: Jars,
  name: InkBottles,
  cover: Canvases,
  stickers: StickerSheets,
  pin: PinBoard,
};

const RARITY: Record<ShopItem["rarity"], string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

export function SupplyStore({ viewer, owned: initialOwned, worn: initialWorn, flowPlus, pick: initialPick, nextPick }: Props) {
  const [owned, setOwned] = useState(() => new Set(initialOwned));
  const [worn, setWorn] = useState(initialWorn);
  const [trying, setTrying] = useState<Worn>(initialWorn);
  const [stickers, setStickers] = useState<PackId | null>(null);
  const [selected, setSelected] = useState<ShopItem>(() => itemOf("frame", initialWorn.frame) ?? itemsOf("frame")[0]);
  const [pick, setPick] = useState(initialPick);
  const [message, setMessage] = useState<{ tone: "ok" | "problem"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const subject: MirrorSubject = viewer ?? { displayName: "You", handle: null, avatar: null, banner: null };
  const firstName = subject.displayName.split(" ")[0] || "You";
  const has = (item: ShopItem) => item.priceUsd === 0 || owned.has(itemKey(item));
  const wearing = (item: ShopItem) => item.kind !== "stickers" && worn[WORN_FIELD[item.kind]] === item.id;
  const changed = useMemo(() => (Object.keys(WORN_FIELD) as (keyof typeof WORN_FIELD)[]).some((k) => trying[WORN_FIELD[k]] !== worn[WORN_FIELD[k]]), [trying, worn]);

  function tagOf(item: ShopItem): Tag {
    if (wearing(item)) return { label: "Wearing", tone: "worn" };
    if (owned.has(itemKey(item))) return { label: "Yours", tone: "owned" };
    if (item.priceUsd === 0) return { label: "Free", tone: "free" };
    return { label: formatItemPrice(item), tone: flowPlus && !pick ? "pick" : "price" };
  }

  function choose(item: ShopItem) {
    setSelected(item);
    setMessage(null);
    if (item.kind === "stickers") return setStickers(item.id as PackId);
    const field = WORN_FIELD[item.kind];
    setTrying((t) => ({ ...t, [field]: item.id }));
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: () => void, success: string) {
    setMessage(null);
    start(async () => {
      const result = await action();
      if (!result.ok) return setMessage({ tone: "problem", text: result.error });
      done();
      setMessage({ tone: "ok", text: success });
    });
  }

  const take = (item: ShopItem) => () => setOwned((set) => new Set(set).add(itemKey(item)));
  const put = (item: ShopItem, id: string | null) => () => {
    if (item.kind === "stickers") return;
    const field = WORN_FIELD[item.kind];
    setWorn((w) => ({ ...w, [field]: id ?? undefined }));
    setTrying((t) => ({ ...t, [field]: id ?? undefined }));
  };

  function actions(item: ShopItem, compact = false): ReactNode {
    const size = compact ? "md" : "lg";
    const wide = compact ? "" : "w-full";
    if (!viewer) {
      return (
        <Link href="/sign-in?next=/shop" className={buttonClasses({ size, className: wide })}>
          Sign in to collect
        </Link>
      );
    }
    const spinner = pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null;

    if (wearing(item)) {
      return (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
          <span className={`flex h-11 items-center justify-center gap-2 rounded-action bg-mint/15 px-4 text-sm font-semibold text-mint-ink dark:text-mint ${wide}`}>
            <Check aria-hidden className="size-4" />
            You&apos;re wearing this
          </span>
          <button type="button" disabled={pending} onClick={() => run(() => wearItem(item.kind, null), put(item, null), "Taken off.")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Take it off
          </button>
        </div>
      );
    }

    if (item.kind === "stickers") {
      // Free packs are everyone's; owned ones too. Either way they're on the board's sticker shelf.
      if (has(item)) {
        return (
          <Link href="/customize?tab=about" className={buttonClasses({ variant: "secondary", size, className: wide })}>
            On your board&apos;s sticker shelf
          </Link>
        );
      }
    } else if (has(item)) {
      return (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => wearItem(item.kind, item.id), () => (take(item)(), put(item, item.id)()), "It's on your profile.")}
          className={buttonClasses({ size, className: wide })}
        >
          {spinner ?? <Sparkles aria-hidden />}
          {owned.has(itemKey(item)) ? "Wear it" : "Take it free & wear it"}
        </button>
      );
    }

    // Paid and not yours yet.
    return (
      <div className={`grid gap-2 ${wide}`}>
        {flowPlus && !pick && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => claimMonthlyPick(item.kind, item.id),
                () => (take(item)(), put(item, item.id)(), setPick(item.name)),
                item.kind === "stickers" ? "Your monthly pick: added to your stickers." : "Your monthly pick: it's on your profile.",
              )
            }
            className={buttonClasses({ size, className: `${wide} bg-lilac! text-white!` })}
          >
            {spinner ?? <Gift aria-hidden />}
            Use your monthly pick
          </button>
        )}
        <button type="button" disabled className={buttonClasses({ variant: flowPlus && !pick ? "secondary" : "primary", size, className: wide })}>
          <Lock aria-hidden />
          {formatItemPrice(item)} · checkout opens soon
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-0">
      <Awning />

      {/* Aisle signs */}
      <nav aria-label="Aisles" className="sticky top-16 z-30 -mx-4 mt-6 overflow-x-auto bg-canvas/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <ul className="flex gap-2">
          {KIND_ORDER.map((kind, i) => (
            <li key={kind} className="shrink-0">
              <a href={`#aisle-${kind}`} className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-ink shadow-soft transition-colors hover:border-ocean/40">
                <span className="font-display text-[0.6875rem] font-extrabold text-muted">{i + 1}</span>
                {KINDS[kind].aisle}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12">
        {/* The mirror and what you picked */}
        <aside aria-label="Fitting mirror" className="lg:sticky lg:top-32">
          <Mirror subject={subject} trying={trying} stickers={stickers} />
          {changed && (
            <button
              type="button"
              onClick={() => (setTrying(worn), setStickers(null))}
              className="mx-auto mt-3 flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Back to what I&apos;m wearing
            </button>
          )}

          <section aria-labelledby="picked-heading" className="mt-5 hidden rounded-card border border-border bg-surface p-5 shadow-soft lg:block">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.625rem] font-bold tracking-[0.16em] text-muted uppercase">{KINDS[selected.kind].where}</p>
                <h2 id="picked-heading" className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
                  {selected.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted">{selected.blurb}</p>
              </div>
              <PriceTag tag={tagOf(selected)} className="-mt-3 shrink-0" />
            </div>
            <p className="mt-3 flex flex-wrap gap-1.5 text-[0.6875rem] font-semibold text-muted">
              <span className="rounded-full bg-ice px-2 py-0.5">{RARITY[selected.rarity]}</span>
              {selected.animated && <span className="rounded-full bg-ice px-2 py-0.5">Animated</span>}
            </p>
            <div className="mt-4">{actions(selected)}</div>
            <Status message={message} />
          </section>
        </aside>

        <div className="min-w-0">
          <MonthlyPick viewer={Boolean(viewer)} flowPlus={flowPlus} pick={pick} nextPick={nextPick} />

          {KIND_ORDER.map((kind, i) => {
            const Display = DISPLAYS[kind];
            return (
              <section key={kind} id={`aisle-${kind}`} aria-labelledby={`aisle-${kind}-heading`} className="mt-12 scroll-mt-36 first:mt-0">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                  <h2 id={`aisle-${kind}-heading`} className="flex items-baseline gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink">
                    <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-on-ink">{i + 1}</span>
                    {KINDS[kind].aisle}
                  </h2>
                  <HandNote tone="muted" className="-rotate-1 text-lg">
                    {KINDS[kind].shelf}
                  </HandNote>
                </div>
                <Display
                  items={itemsOf(kind)}
                  selected={selected.kind === kind ? selected.id : null}
                  tagOf={tagOf}
                  onPick={choose}
                  avatar={subject.avatar}
                  banner={subject.banner}
                  firstName={firstName}
                />
              </section>
            );
          })}
        </div>
      </div>

      {/* Phones: what you picked, and its button, at the bottom. */}
      <div data-floating-post className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[0.9375rem] font-extrabold text-ink">{selected.name}</p>
            <p className="truncate text-xs text-muted">{tagOf(selected).label} · {KINDS[selected.kind].where}</p>
          </div>
          <div className="shrink-0">{actions(selected, true)}</div>
        </div>
        <Status message={message} />
      </div>
    </div>
  );
}

function Status({ message }: { message: { tone: "ok" | "problem"; text: string } | null }) {
  return (
    <p
      role={message?.tone === "problem" ? "alert" : "status"}
      className={`mt-2 text-center text-sm empty:hidden ${message?.tone === "problem" ? "text-danger" : "text-mint-ink dark:text-mint"}`}
    >
      {message?.text}
    </p>
  );
}

/** The shop's front: a scalloped awning and the painted sign. */
function Awning() {
  return (
    <div aria-hidden className="relative">
      <div
        className="h-12 rounded-t-[14px] bg-[repeating-linear-gradient(90deg,var(--ocean)_0_40px,var(--surface)_40px_80px)] shadow-soft"
        style={{
          maskImage: "radial-gradient(20px 12px at 20px 100%, transparent 98%, black) 0 0 / 40px 100% repeat-x",
          WebkitMaskImage: "radial-gradient(20px 12px at 20px 100%, transparent 98%, black) 0 0 / 40px 100% repeat-x",
        }}
      />
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 rounded-[6px] bg-shelf px-5 py-1.5 shadow-lift ring-2 ring-shelf-edge">
        <p className="font-display text-sm font-extrabold tracking-[0.12em] whitespace-nowrap text-ink uppercase">
          Artiflow Supply Co. <span className="font-hand text-base tracking-normal normal-case opacity-75">est. 2026</span>
        </p>
      </div>
    </div>
  );
}

/** Flow+'s monthly pick, as a coupon clipped to the first shelf. */
function MonthlyPick({ viewer, flowPlus, pick, nextPick }: { viewer: boolean; flowPlus: boolean; pick: string | null; nextPick: string }) {
  const [title, body] = flowPlus
    ? pick
      ? [`This month's pick: ${pick}`, `Your next one comes on ${nextPick}.`]
      : ["Your monthly pick is waiting", "Anything with a price tag, on the house. Pick it, then press “Use your monthly pick”."]
    : ["Flow+ members pick one supply a month, free", viewer ? "Any frame, effect, ink, cover, pack or pin with a price tag." : "Sign in, and with Flow+, any paid supply is yours once a month."];
  return (
    <div className="relative mb-10 flex items-center gap-4 rounded-card border-2 border-dashed border-lilac/45 bg-lilac/8 px-5 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lilac text-white shadow-soft [&_svg]:size-5">
        <Gift aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-extrabold text-ink">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
      {!flowPlus && (
        <Link href="/plans#flow-plus" className={buttonClasses({ variant: "secondary", size: "sm" })}>
          See Flow+
        </Link>
      )}
    </div>
  );
}
