import { Tape } from "@/components/explore/doodles";
import { relativeDay } from "@/lib/commissions/queue";
import { shipment, type MyRequest } from "@/lib/commissions/requests";
import { formatUsd } from "@/lib/format";

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Bars (x, width) from the handle, so every buyer's label has its own barcode. */
function bars(seed: string) {
  let h = 2166136261;
  let x = 0;
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < 34; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i % seed.length) ^ i, 16777619);
    const w = (1 + ((h >>> 0) % 3)) * 0.9;
    if (i % 7 !== 6) out.push({ x, w });
    x += w + 0.9 + (i % 4 === 3 ? 0.8 : 0);
  }
  return out;
}

/**
 * The parcel label stuck on top: who it ships to, what arrives next, and the
 * numbers that matter to a buyer (work in progress, quotes waiting on you,
 * what you've spent this year).
 */
export function ShippingLabel({ handle, requests, today }: { handle: string; requests: MyRequest[]; today: string }) {
  const label = shipment(requests, today);
  const year = today.slice(0, 4);

  return (
    <aside aria-labelledby="label-heading" className="relative mx-auto w-full max-w-[25rem] -rotate-[1.6deg] lg:mr-0 lg:ml-auto">
      <Tape tone="lilac" className="-top-3 left-8 -rotate-6" />
      <div className="grain overflow-hidden rounded-[6px] bg-paper text-on-paper shadow-lift">
        <div className="flex items-center justify-between border-b-2 border-on-paper/80 px-5 py-2.5">
          <span id="label-heading" className="font-display text-sm font-black tracking-[0.22em] uppercase">
            Priority
          </span>
          <span className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Handmade · Fragile</span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Ship to</p>
          <p className="truncate font-display text-xl font-extrabold">@{handle}</p>
        </div>

        <div className="mx-5 mt-3.5 border-t border-dashed border-on-paper/20 pt-3.5">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">Next arrival</p>
          {label.next ? (
            <p className="mt-1 text-sm">
              <span className="font-semibold">{label.next.service}</span>
              <span className="text-paper-muted"> from {label.next.artist.name}</span>
              <span className="mt-0.5 block font-display text-base font-extrabold">
                {label.nextInDays! < 0 ? `${-label.nextInDays!} days late` : `Due ${relativeDay(label.nextInDays!)}`}
                <span className="font-sans text-sm font-normal text-paper-muted"> · {weekday.format(new Date(label.next.dueAt!))}</span>
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-paper-muted">Nothing in the works yet.</p>
          )}
        </div>

        <div className="mt-4 px-5" aria-hidden>
          <svg viewBox="0 0 120 26" preserveAspectRatio="none" className="h-10 w-full">
            {bars(handle).map((bar) => (
              <rect key={bar.x} x={bar.x} y="0" width={bar.w} height="26" fill="currentColor" />
            ))}
          </svg>
          <p className="mt-1 text-center text-[0.625rem] font-semibold tracking-[0.35em] text-paper-muted tabular-nums">
            AF {String(requests.length).padStart(4, "0")} {year} {handle.slice(0, 4).toUpperCase()}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-t-2 border-on-paper/80">
          <Stat label="in the works" value={String(label.making)} />
          <Stat label={label.quotes === 1 ? "quote for you" : "quotes for you"} value={String(label.quotes)} strong={label.quotes > 0} />
          <Stat label={`spent in ${year}`} value={formatUsd(label.spentThisYearUsd)} last />
        </dl>
      </div>
    </aside>
  );
}

function Stat({ label, value, strong = false, last = false }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <div className={`flex flex-col-reverse px-4 py-3 ${last ? "" : "border-r border-dashed border-on-paper/20"}`}>
      <dt className="text-xs leading-tight text-paper-muted">{label}</dt>
      <dd className={`font-display text-xl leading-tight font-extrabold tabular-nums ${strong ? "text-lilac-ink dark:text-lilac" : ""}`}>{value}</dd>
    </div>
  );
}

/** Same footprint while it streams in. */
export function ShippingLabelSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[25rem] -rotate-[1.6deg] lg:mr-0 lg:ml-auto">
      <div className="h-[22rem] skeleton rounded-[6px] bg-paper/70 shadow-soft" />
    </div>
  );
}
