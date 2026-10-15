"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatTick, formatValue, type Unit } from "@/lib/admin/format";

/*
 * The back office's chart over time: columns (stacked when there are several
 * series) or a line. Thin marks, hairline grid, one baseline; a crosshair
 * and a tooltip on hover and on the arrow keys; every number also in the
 * table under it. Sized in percentages, so it needs no measuring.
 */

export type ChartSeries = {
  id: string;
  label: string;
  /** A CSS color, e.g. "var(--series-1)". Never used for text. */
  color: string;
  values: number[];
};

export type ChartPoint = { short: string; long: string };

type TimeChartProps = {
  label: string;
  points: ChartPoint[];
  series: ChartSeries[];
  kind?: "columns" | "line";
  unit?: Unit;
  /** Plot height in px (the x-axis band comes on top). */
  height?: number;
  /** Small multiples: no y labels, no legend. */
  compact?: boolean;
  /** A level drawn across the plot, e.g. the average. */
  reference?: { value: number; label: string };
  empty?: string;
};

const NICE = [1, 2, 2.5, 5, 10];

/** A round top for the axis and the steps up to it: 0 / 5 / 10 / 15 / 20. */
function scaleOf(max: number, unit: Unit, ticks: number) {
  if (max <= 0) return { top: unit === "usd" ? 10 : 1, step: unit === "usd" ? 10 : 1 };
  const raw = max / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  let step = (NICE.find((n) => n * power >= raw) ?? 10) * power;
  if (unit === "count") step = Math.max(1, Math.round(step));
  return { top: Math.ceil(max / step - 1e-9) * step, step };
}

export function TimeChart({
  label,
  points,
  series,
  kind = "columns",
  unit = "count",
  height = 180,
  compact = false,
  reference,
  empty = "Nothing yet in this period.",
}: TimeChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [fromKeys, setFromKeys] = useState(false);
  const summaryId = useId();
  const n = points.length;
  // How many dates fit under the axis depends on how wide it is.
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = plot.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stacked = kind === "columns";
  const peaks = points.map((_, i) =>
    stacked ? series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0) : Math.max(0, ...series.map((s) => s.values[i] ?? 0)),
  );
  const max = Math.max(0, ...peaks, reference?.value ?? 0);
  const { top, step } = scaleOf(max, unit, compact ? 2 : 4);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const isEmpty = max === 0;

  const pct = (v: number) => (v / top) * 100;
  const center = (i: number) => ((i + 0.5) / n) * 100;

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.floor(((event.clientX - box.left) / box.width) * n);
    setFromKeys(false);
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function step_(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setFromKeys(true);
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + moves[event.key])));
  }

  // A date every ~80px (about six before the width is known), always including the last one.
  const fit = width === null ? (compact ? 3 : 6) : Math.max(2, Math.floor(width / 80));
  const every = Math.max(1, Math.ceil(n / fit));
  const shown = points.map((_, i) => i).filter((i) => i % every === 0 && n - 1 - i >= every * 0.75);
  if (n) shown.push(n - 1);

  const tooltip = active === null ? null : (
    <Readout point={points[active]} series={series} index={active} unit={unit} total={stacked && series.length > 1} />
  );

  return (
    <figure className="min-w-0">
      {!compact && series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={kind === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]"}
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className={compact ? "" : "pl-9"}>
        <div
          ref={plot}
          role="group"
          tabIndex={0}
          aria-label={label}
          aria-describedby={summaryId}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onKeyDown={step_}
          onFocus={() => {
            setFromKeys(true);
            setActive((i) => i ?? n - 1);
          }}
          onBlur={() => setActive(null)}
          className="relative touch-pan-y rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
          style={{ height }}
        >
          {/* Grid: solid hairlines, the baseline a step darker. */}
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className={`absolute inset-x-0 border-t ${tick === 0 ? "border-muted/45" : "border-border/80"}`}
              style={{ bottom: `${pct(tick)}%` }}
            >
              {!compact && (
                <span className="absolute -left-9 w-7 -translate-y-1/2 text-right text-[0.6875rem] text-muted tabular-nums">
                  {formatTick(tick, unit)}
                </span>
              )}
            </div>
          ))}

          {kind === "columns" ? (
            <div aria-hidden className="absolute inset-0 flex">
              {points.map((point, i) => {
                let below = 0;
                const visible = series.filter((s) => (s.values[i] ?? 0) > 0);
                return (
                  <div key={point.long} className={`relative h-full flex-1 ${active === i ? "bg-ink/[0.045]" : ""}`}>
                    <div className="absolute inset-y-0 left-1/2 w-[min(24px,64%)] -translate-x-1/2">
                      {visible.map((s, k) => {
                        const value = s.values[i];
                        const bottom = pct(below);
                        below += value;
                        return (
                          <span
                            key={s.id}
                            className={`absolute inset-x-0 border-surface ${k > 0 ? "border-t-2" : ""} ${k === visible.length - 1 ? "rounded-t-[4px]" : ""}`}
                            style={{ bottom: `${bottom}%`, height: `max(${k > 0 ? 4 : 2}px, ${pct(value)}%)`, backgroundColor: s.color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <svg aria-hidden viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                {series.map((s) => {
                  const coords = s.values.map((v, i) => `${center(i) * 10},${1000 - pct(v) * 10}`);
                  if (!coords.length) return null;
                  const line = `M${coords.join("L")}`;
                  return (
                    <g key={s.id}>
                      {series.length === 1 && (
                        <path d={`${line}L${center(n - 1) * 10},1000L${center(0) * 10},1000Z`} fill={s.color} opacity={0.1} />
                      )}
                      <path
                        d={line}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </svg>
              {active !== null && (
                <div aria-hidden className="absolute inset-y-0 w-px bg-muted/60" style={{ left: `${center(active)}%` }} />
              )}
              {series.map((s) => {
                const i = active ?? n - 1;
                if (!n || (active === null && isEmpty)) return null;
                return (
                  <span
                    key={s.id}
                    aria-hidden
                    className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-surface"
                    style={{ left: `${center(i)}%`, bottom: `${pct(s.values[i] ?? 0)}%`, backgroundColor: s.color }}
                  />
                );
              })}
            </>
          )}

          {reference && reference.value > 0 && (
            <div aria-hidden className="absolute inset-x-0 border-t border-ink/35" style={{ bottom: `${pct(reference.value)}%` }}>
              <span className="absolute right-0 bottom-0.5 rounded-[4px] bg-surface/85 px-1 text-[0.6875rem] font-medium text-ink">
                {reference.label}
              </span>
            </div>
          )}

          {isEmpty && (
            <p className="absolute inset-0 grid place-items-center pb-6 text-sm text-muted">{empty}</p>
          )}

          {tooltip && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 z-10 w-max max-w-[15rem] rounded-[10px] border border-border bg-surface px-3 py-2 shadow-lift"
              style={
                center(active!) > 50
                  ? { right: `calc(${100 - center(active!)}% + 10px)` }
                  : { left: `calc(${center(active!)}% + 10px)` }
              }
            >
              {tooltip}
            </div>
          )}
        </div>

        {/* Dates under the axis. */}
        <div aria-hidden className="relative h-6 text-[0.6875rem] text-muted tabular-nums">
          {shown.map((i) => (
            <span
              key={i}
              className="absolute top-1.5 w-14 text-center"
              style={{ left: `clamp(0px, calc(${center(i)}% - 1.75rem), calc(100% - 3.5rem))` }}
            >
              {points[i].short}
            </span>
          ))}
        </div>
      </div>

      <p id={summaryId} className="sr-only">
        {n} points, from {points[0]?.long} to {points[n - 1]?.long}. Use the arrow keys to read each one; the table below has
        them all.
      </p>
      <p aria-live="polite" className="sr-only">
        {fromKeys && active !== null ? readoutText(points[active], series, active, unit) : ""}
      </p>

      <details className="group mt-1">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[6px] text-xs font-semibold text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show the numbers</span>
          <span className="hidden group-open:inline">Hide the numbers</span>
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[10px] border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ice text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  When
                </th>
                {series.map((s) => (
                  <th key={s.id} scope="col" className="px-3 py-2 text-right font-semibold">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {points.map((point, i) => (
                <tr key={point.long} className="border-t border-border">
                  <th scope="row" className="px-3 py-1.5 font-medium text-ink">
                    {point.long}
                  </th>
                  {series.map((s) => (
                    <td key={s.id} className="px-3 py-1.5 text-right text-ink">
                      {formatValue(s.values[i] ?? 0, unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function Readout({
  point,
  series,
  index,
  unit,
  total,
}: {
  point: ChartPoint;
  series: ChartSeries[];
  index: number;
  unit: Unit;
  total: boolean;
}) {
  return (
    <>
      <p className="text-[0.6875rem] text-muted">{point.long}</p>
      <ul className="mt-1 grid gap-0.5">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-semibold text-ink tabular-nums">{formatValue(s.values[index] ?? 0, unit)}</span>
            <span className="truncate text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
      {total && (
        <p className="mt-1 border-t border-border pt-1 text-xs">
          <span className="font-semibold text-ink tabular-nums">
            {formatValue(
              series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0),
              unit,
            )}
          </span>{" "}
          <span className="text-muted">in all</span>
        </p>
      )}
    </>
  );
}

function readoutText(point: ChartPoint, series: ChartSeries[], index: number, unit: Unit) {
  return `${point.long}: ${series.map((s) => `${s.label} ${formatValue(s.values[index] ?? 0, unit)}`).join(", ")}`;
}
