import Link from "next/link";
import { ArrowRight, Check, CreditCard } from "lucide-react";
import { Tape } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import { FEE_FREE, FEE_FREE_UNTIL_LABEL, PLATFORM_FEE_PERCENT, PROCESSOR_FEE_US, processorFeeUs } from "@/lib/plans";
import { formatUsdExact } from "@/lib/format";

const EXAMPLE_USD = 100;

/**
 * The founding artists' offer, as a notice pinned to the studio wall: the
 * old fee crossed out in pencil, what's free and what isn't. Says plainly
 * that only Artiflow's own fee is off: Stripe's processing fee is Stripe's,
 * taken from every card payment before it reaches the artist.
 */
export function FeeFreeBanner({
  className = "",
  id,
  action,
}: {
  className?: string;
  id?: string;
  /** A way in for artists, where the banner is public (Open studios). */
  action?: { href: string; label: string };
}) {
  const stripeFee = processorFeeUs(EXAMPLE_USD);
  return (
    <section
      id={id}
      aria-labelledby="fee-free-heading"
      className={`grain relative rounded-panel bg-paper px-5 pt-7 pb-6 text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_18px_40px_-22px_rgb(var(--shadow-rgb)/0.45)] sm:px-8 ${className}`}
    >
      <Tape tone="mint" className="-top-2.5 left-10 rotate-[-4deg]" />
      <Tape tone="lilac" className="-top-2.5 right-12 rotate-[5deg]" />

      <div className="grid items-center gap-x-8 gap-y-5 md:grid-cols-[auto_minmax(0,1fr)]">
        <FeeTicket />

        <div className="min-w-0">
          <Stamp tone="mint" onPaper className="-rotate-2">
            Founding artists · {FEE_FREE.months} months
          </Stamp>
          <h2 id="fee-free-heading" className="mt-3 font-display text-[1.625rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[2rem]">
            No platform fee for your first {FEE_FREE.months} months.
          </h2>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-paper-muted">
            Artiflow keeps nothing from your sales: 0% of every commission and adoptable until {FEE_FREE_UNTIL_LABEL}. After that, our
            platform fee is {PLATFORM_FEE_PERCENT}%.
          </p>
          {action && (
            <Link href={action.href} className={buttonClasses({ size: "lg", className: "mt-4" })}>
              {action.label}
              <ArrowRight aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-on-paper/10 bg-mint/10 p-4">
          <dt className="flex items-center gap-2 text-sm font-bold">
            <Check aria-hidden className="size-4 text-mint-ink dark:text-mint" />
            Artiflow&apos;s platform fee: <span className="font-display text-base font-extrabold">0%</span>
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-paper-muted">
            Our cut of each sale, the marketplace&apos;s own fee. We&apos;re giving it up for {FEE_FREE.months} months.
          </dd>
        </div>
        <div className="rounded-[16px] border border-dashed border-on-paper/20 p-4">
          <dt className="flex items-center gap-2 text-sm font-bold">
            <CreditCard aria-hidden className="size-4 text-paper-muted" />
            Stripe&apos;s processing fee: still applies
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-paper-muted">
            Stripe, the company that processes the cards, takes it from every payment before the money reaches you ({PROCESSOR_FEE_US.label};
            it depends on your country and the buyer&apos;s card). It&apos;s Stripe&apos;s, not ours: we never see it.
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-dashed border-on-paper/15 pt-4 text-sm">
        <span className="font-semibold">A {formatUsdExact(EXAMPLE_USD)} commission</span>
        <span className="text-paper-muted">(US artist, US card):</span>
        <span>
          Artiflow <b className="font-display font-extrabold">$0</b>
        </span>
        <span aria-hidden className="text-paper-muted">·</span>
        <span>
          Stripe <b className="font-display font-extrabold">{formatUsdExact(stripeFee)}</b>
        </span>
        <span aria-hidden className="text-paper-muted">·</span>
        <span>
          you get <b className="font-display font-extrabold text-mint-ink dark:text-mint">{formatUsdExact(EXAMPLE_USD - stripeFee)}</b>
        </span>
      </p>
    </section>
  );
}

/** The fee as a paper ticket: the old number struck out in red pencil, the new one inked over it. */
export function FeeTicket({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-40 shrink-0 -rotate-3 md:mx-0 ${className}`}>
      <div className="flex flex-col items-center rounded-[14px] border-2 border-dashed border-on-paper/20 bg-paper px-3 pt-4 pb-3 text-center text-on-paper">
        <span className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Platform fee</span>
        <span className="relative mt-1 font-display text-[1.625rem] leading-none font-extrabold text-paper-muted tabular-nums">
          {PLATFORM_FEE_PERCENT}%
          <span aria-hidden className="absolute top-1/2 -left-2 h-[3px] w-[calc(100%+1rem)] -rotate-[12deg] rounded-full bg-like/80" />
        </span>
        <span className="sr-only">now</span>
        <span className="mt-1 font-display text-[3.25rem] leading-none font-extrabold tabular-nums">0%</span>
        <span className="mt-1.5 text-[0.6875rem] leading-tight text-paper-muted">until {FEE_FREE_UNTIL_LABEL}</span>
      </div>
    </div>
  );
}
