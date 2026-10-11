"use client";

import { Info } from "lucide-react";
import { extrasUsd, isOptional, pickOptions, type Option } from "@/lib/commissions/addons";
import { formatUsd, formatUsdExact } from "@/lib/format";

/**
 * Licenses and add-ons, ticked the way artists mark them on a commission
 * sheet: a pen circle that gets a pink cross. Included ones come ticked and
 * locked; licenses the artist doesn't offer are struck out. Real checkboxes
 * underneath, named `addonIds`, so a surrounding form sends them.
 */
export function OptionsPicker({
  options,
  selected,
  onChange,
  className = "",
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    // Keep the artist's order.
    onChange(pickOptions(options, next).map((option) => option.id));
  }

  const groups = [
    { id: "license", title: "Usage", items: options.filter((o) => o.group === "license") },
    { id: "addon", title: "Add-ons", items: options.filter((o) => o.group === "addon") },
  ].filter((group) => group.items.length > 0);

  return (
    <div className={`grid gap-4 ${className}`}>
      {groups.map((group) => (
        <fieldset key={group.id}>
          <legend className="text-xs font-bold tracking-wider text-muted uppercase">{group.title}</legend>
          <ul className="mt-2 grid gap-0.5">
            {group.items.map((option) => (
              <Row
                key={option.id}
                option={option}
                on={selected.includes(option.id)}
                onToggle={(on) => toggle(option.id, on)}
              />
            ))}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

function Row({ option, on, onToggle }: { option: Option; on: boolean; onToggle: (on: boolean) => void }) {
  const { price } = option;
  const included = price?.kind === "included";
  const offered = price !== null;
  const optional = isOptional(option);

  return (
    <li>
      <label
        data-option={option.id}
        className={`-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-1.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ocean ${
          optional ? "cursor-pointer hover:bg-ice/60" : ""
        } ${on ? "bg-ice/50" : ""}`}
      >
        <input
          type="checkbox"
          name={optional ? "addonIds" : undefined}
          value={option.id}
          checked={on || included}
          disabled={!optional}
          onChange={(event) => onToggle(event.target.checked)}
          className="sr-only"
        />
        <HandTick state={included ? "locked" : on ? "on" : offered ? "off" : "none"} />
        <span className="min-w-0 flex-1">
          <span
            className={`flex items-center gap-1.5 text-[0.9375rem] leading-snug font-semibold ${
              offered ? "text-ink" : "text-muted line-through"
            }`}
          >
            {option.label}
            {option.group === "license" && option.hint && (
              <span title={option.hint} className="text-muted/80 no-underline">
                <Info aria-hidden className="size-3.5" />
                <span className="sr-only">: {option.hint}</span>
              </span>
            )}
          </span>
          {option.group === "addon" && option.hint && <span className="block text-xs text-muted">{option.hint}</span>}
        </span>
        <span
          className={`shrink-0 tabular-nums ${
            optional ? `font-display text-base font-extrabold ${on ? "text-ink" : "text-muted"}` : "text-sm text-muted"
          }`}
        >
          {!price ? "Not offered" : price.kind === "included" ? "Included" : price.kind === "fixed" ? `+${formatUsd(price.usd)}` : `+${price.percent}%`}
        </span>
      </label>
    </li>
  );
}

/** "$85 + $45 in extras = from $130": the price as it stands with what's ticked. */
export function OptionsTotal({ base, options, selected }: { base: number; options: Option[]; selected: string[] }) {
  const extra = extrasUsd(pickOptions(options, selected), base);
  if (extra === 0) return null;
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {formatUsd(base)} + {formatUsdExact(extra)} in extras ={" "}
      <span className="font-display text-base font-extrabold text-ink">from {formatUsdExact(base + extra)}</span>
    </p>
  );
}

/**
 * A pen circle. Ticked: a pink cross is drawn through it. Included: the cross
 * is there already, in pencil (it can't be taken off). Not offered: dashed.
 */
function HandTick({ state }: { state: "on" | "off" | "locked" | "none" }) {
  const crossed = state === "on" || state === "locked";
  const draw = `transition-[stroke-dashoffset] duration-300 ease-out [stroke-dasharray:1] ${crossed ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]"}`;
  const cross = state === "locked" ? "stroke-muted/70" : "stroke-like";
  return (
    <svg aria-hidden viewBox="0 0 28 28" fill="none" className="size-7 shrink-0">
      <path
        d="M14.6 3.4c6 .2 10.2 4.6 9.9 10.6-.3 5.8-5 10-10.8 9.8C7.9 23.6 3.6 19 3.9 13.4 4.2 7.6 8.6 3.5 15.8 3.9"
        className={state === "on" ? "stroke-ocean" : "stroke-muted/50"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={state === "none" ? "3 3.5" : undefined}
      />
      <path d="M9.5 9.5c2.6 2.8 5.4 5.7 9 9.2" pathLength={1} className={`${cross} ${draw}`} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M18.6 9.2c-3 2.9-5.9 6-9 9.4"
        pathLength={1}
        className={`${cross} ${draw} ${state === "on" ? "delay-150" : ""}`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
