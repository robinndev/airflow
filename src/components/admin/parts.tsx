import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatChange, formatValue, type Unit } from "@/lib/admin/format";
import type { Change } from "@/lib/admin/metrics";

/*
 * The back office's building blocks, server-rendered: cards, section
 * headings, stat tiles with a sparkline (the period before in grey, this one
 * in the accent), the change against the period before, and labelled bars.
 */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-card border border-border bg-surface p-5 shadow-soft sm:p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ title, hint, aside }: { title: string; hint?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

/** A section of the page: a small label, a heading and what it's about. */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="mt-16 scroll-mt-24 first:mt-0">
      <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">{eyebrow}</p>
      <h2 id={`${id}-heading`} className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
        {title}
      </h2>
      {lede && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pretty text-muted">{lede}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** "+12% vs the 30 days before", with an arrow so it never relies on color. */
export function ChangeNote({
  change,
  against,
  upIsGood = true,
}: {
  change: Change | null;
  against: string;
  upIsGood?: boolean;
}) {
  if (!change) return null;
  const good = change.direction === "flat" ? null : (change.direction === "up") === upIsGood;
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
      <span
        className={`inline-flex items-center gap-0.5 font-semibold ${
          good === null ? "text-muted" : good ? "text-mint-ink" : "text-danger"
        }`}
      >
        <Icon aria-hidden className="size-3.5" />
        {formatChange(change)}
      </span>
      <span>{against}</span>
    </p>
  );
}

/** Before → now as one line: the period before in grey, this one in the accent. */
export function Sparkline({ previous, current, label }: { previous: number[]; current: number[]; label: string }) {
  const all = [...previous, ...current];
  if (all.length < 2) return null;
  const max = Math.max(...all, 0) || 1;
  const x = (i: number) => (i / (all.length - 1)) * 100;
  const y = (v: number) => 30 - (v / max) * 28;
  const path = (from: number, to: number) =>
    all
      .slice(from, to)
      .map((v, k) => `${k === 0 ? "M" : "L"}${x(from + k)},${y(v)}`)
      .join("");
  // The two halves share the point where one period hands over to the next.
  const join = Math.max(0, previous.length - 1);
  return (
    <svg role="img" aria-label={label} viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-3 h-8 w-full overflow-visible">
      {previous.length > 0 && (
        <path d={path(0, previous.length + 1)} fill="none" stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      )}
      <path
        d={path(previous.length ? join + 1 : 0, all.length)}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  change,
  against,
  upIsGood,
  detail,
  trend,
}: {
  label: string;
  value: string;
  change?: Change | null;
  against?: string;
  upIsGood?: boolean;
  detail?: ReactNode;
  trend?: { previous: number[]; current: number[] };
}) {
  return (
    <Card className="flex flex-col !p-5">
      <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-ink">{value}</p>
      {change !== undefined && against && <ChangeNote change={change} against={against} upIsGood={upIsGood} />}
      {detail && <p className="mt-1 text-xs leading-snug text-muted">{detail}</p>}
      {trend && <Sparkline {...trend} label={`${label}: the period before in grey, this one in color`} />}
    </Card>
  );
}

/** A labelled number in a list of facts. */
export function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="text-xs leading-snug text-muted">
        {label}
        {hint && <span className="block text-muted/80">{hint}</span>}
      </dt>
      <dd className="font-display text-xl leading-tight font-extrabold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Horizontal bars, one series: the label above, the value at the bar's tip.
 * `max` sets the full width (defaults to the largest value).
 */
export function BarList({
  rows,
  unit = "count",
  max,
  empty = "Nothing yet.",
}: {
  rows: { id: string; label: ReactNode; value: number; note?: ReactNode }[];
  unit?: Unit;
  max?: number;
  empty?: string;
}) {
  const top = max ?? Math.max(0, ...rows.map((row) => row.value));
  if (!rows.length || top === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{row.label}</span>
            {row.note && <span className="shrink-0 text-xs text-muted tabular-nums">{row.note}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2.5 min-w-0 flex-1 rounded-r-[4px]">
              <div
                className="h-full rounded-r-[4px] bg-series-1"
                style={{ width: `max(${row.value > 0 ? 3 : 0}px, ${(row.value / top) * 100}%)` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink tabular-nums">{formatValue(row.value, unit)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
