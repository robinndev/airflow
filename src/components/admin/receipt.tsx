import Link from "next/link";
import { adminHref, FEE_PRESETS, type AdminQuery } from "@/lib/admin/range";
import { formatValue } from "@/lib/admin/format";
import type { Change, ReceiptLine } from "@/lib/admin/metrics";
import { PLATFORM_FEE_PERCENT } from "@/lib/plans";
import { ChangeNote } from "./parts";

/*
 * What Artiflow kept in the period, printed like a till receipt: one line
 * per source, the total as the page's one big number, and the fee to try
 * at the bottom ("what if we took 6%?"). Paper stays light in both themes.
 */

const EDGES =
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 14px 51% repeat-x, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 14px 51% repeat-x";

export function Receipt({
  lines,
  totalUsd,
  change,
  against,
  period,
  feePercent,
  query,
}: {
  lines: ReceiptLine[];
  totalUsd: number;
  change: Change | null;
  against: string;
  period: string;
  feePercent: number;
  query: AdminQuery;
}) {
  const fees = [...new Set([...FEE_PRESETS, PLATFORM_FEE_PERCENT, feePercent])].sort((a, b) => a - b);
  const trying = feePercent !== PLATFORM_FEE_PERCENT;

  return (
    <aside
      aria-labelledby="receipt-heading"
      className="relative mx-auto w-full max-w-[26rem] -rotate-[0.8deg] [filter:drop-shadow(0_1px_1px_rgb(var(--shadow-rgb)/0.12))_drop-shadow(0_14px_22px_rgb(var(--shadow-rgb)/0.14))] lg:mx-0"
    >
      <div className="grain bg-paper px-6 pt-8 pb-9 text-on-paper" style={{ mask: EDGES, WebkitMask: EDGES }}>
        <div className="text-center">
          <p className="text-[0.625rem] font-bold tracking-[0.32em] uppercase">Artiflow</p>
          <h2 id="receipt-heading" className="mt-1 font-display text-lg font-extrabold">
            What we kept
          </h2>
          <p className="mt-0.5 text-xs text-paper-muted">{period}</p>
        </div>

        <ul className="mt-5 grid gap-3 border-y border-dashed border-on-paper/25 py-4 text-sm">
          {lines.map((line) => (
            <li key={line.id}>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-medium">{line.label}</span>
                <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-on-paper/35" />
                <span className="shrink-0 font-semibold tabular-nums">{formatValue(line.usd, "usd")}</span>
              </div>
              <p className="text-xs text-paper-muted tabular-nums">{lineNote(line, feePercent)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="pb-2 text-[0.625rem] font-bold tracking-[0.2em] uppercase">Total</span>
          <span className="font-display text-5xl leading-none font-extrabold tracking-[-0.03em]">{formatValue(totalUsd, "usd")}</span>
        </div>
        <div className="mt-2 flex justify-end [&_p]:text-paper-muted">
          <ChangeNote change={change} against={against} />
        </div>

        <div className="mt-5 border-t border-dashed border-on-paper/25 pt-4">
          <p className="text-xs text-paper-muted">
            {trying ? (
              <>
                Trying a <span className="font-semibold text-on-paper">{feePercent}%</span> fee. The site charges{" "}
                {PLATFORM_FEE_PERCENT}% (<code className="text-[0.6875rem]">src/lib/plans.ts</code>).
              </>
            ) : (
              <>What if the fee were…</>
            )}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Try another fee">
            {fees.map((fee) => {
              const current = fee === feePercent;
              return (
                <li key={fee}>
                  <Link
                    href={adminHref(query, { fee: fee === PLATFORM_FEE_PERCENT ? null : fee })}
                    scroll={false}
                    aria-current={current ? "true" : undefined}
                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold tabular-nums transition-colors ${
                      current
                        ? "border-on-paper bg-on-paper text-paper"
                        : "border-on-paper/25 text-on-paper hover:border-on-paper/60"
                    }`}
                  >
                    {fee}%{fee === PLATFORM_FEE_PERCENT && <span className="font-medium opacity-70">set</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-5 text-center text-[0.6875rem] leading-snug text-paper-muted">
          Estimated: no checkout yet. Orders the team marked paid, adoptables marked sold, plans the team gave.
        </p>
        {/* A barcode, for the look of it. */}
        <div aria-hidden className="mx-auto mt-4 h-8 w-40 bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_4px,currentColor_4px_5px,transparent_5px_8px,currentColor_8px_11px,transparent_11px_12px)] opacity-80" />
      </div>
    </aside>
  );
}

function lineNote(line: ReceiptLine, feePercent: number) {
  const n = formatValue(line.count);
  switch (line.id) {
    case "commissions":
      return `${feePercent}% of ${formatValue(line.basisUsd ?? 0, "usd")} · ${n} ${line.count === 1 ? "order" : "orders"} paid`;
    case "adoptables":
      return `${feePercent}% of ${formatValue(line.basisUsd ?? 0, "usd")} · ${n} adopted`;
    case "shop":
      return `${n} ${line.count === 1 ? "item" : "items"} bought, every cent ours`;
    case "plans":
      return `${n} ${line.count === 1 ? "member" : "members"} today, by the day`;
  }
}
