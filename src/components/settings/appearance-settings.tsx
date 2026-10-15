"use client";

import { Check, MonitorSmartphone } from "lucide-react";
import type { ChangeEvent } from "react";
import { ThemePreview, applyPreference, useThemePreference } from "@/components/site/theme-menu";
import { chooseTileSize, useTileSize, type Size } from "@/components/wall/tile-size";
import { THEMES, type Theme, type ThemePreference } from "@/lib/theme";

/*
 * How Artiflow looks in this browser: the theme (the same choice as the
 * header's theme menu) and how big Explore's wall hangs its pieces.
 */

const card =
  "group/option relative block cursor-pointer rounded-[18px] p-2 ring-1 ring-border transition-[box-shadow,background-color] hover:bg-ice/60 has-checked:ring-2 has-checked:ring-ocean has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ocean";

function Tick() {
  return (
    <span className="absolute -top-1.5 -right-1.5 z-10 grid size-6 scale-75 place-items-center rounded-full bg-ocean text-white opacity-0 shadow-soft transition-[opacity,scale] peer-checked:scale-100 peer-checked:opacity-100">
      <Check aria-hidden className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export function ThemeSetting() {
  const preference = useThemePreference();

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const rect = event.currentTarget.parentElement!.getBoundingClientRect();
    applyPreference(event.currentTarget.value as ThemePreference, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(THEMES) as Theme[]).map((theme) => (
          <label key={theme} className={card}>
            <input type="radio" name="settings-theme" value={theme} checked={preference === theme} onChange={onChange} className="peer sr-only" />
            <ThemePreview theme={theme} />
            <Tick />
            <span className="block px-1.5 pt-2.5 pb-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-ink">{THEMES[theme].name}</span>
                <span className="rounded-full bg-ice px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted">{THEMES[theme].mode}</span>
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{THEMES[theme].mood}</span>
            </span>
          </label>
        ))}
        <label className={card}>
          <input type="radio" name="settings-theme" value="system" checked={preference === "system"} onChange={onChange} className="peer sr-only" />
          {/* Half Aqua, half Ember: whichever your device is in. */}
          <span aria-hidden className="relative block overflow-hidden rounded-[12px] border border-border">
            <span className="block [clip-path:polygon(0_0,100%_0,0_100%)]">
              <ThemePreview theme="aqua" />
            </span>
            <span className="absolute inset-0 block [clip-path:polygon(100%_0,100%_100%,0_100%)]">
              <ThemePreview theme="ember" />
            </span>
          </span>
          <Tick />
          <span className="block px-1.5 pt-2.5 pb-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-ink">Match my device</span>
              <MonitorSmartphone aria-hidden className="size-4 text-muted" />
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted">Aqua by day, Ember when your device goes dark</span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}

const SIZES: { size: Size; name: string; hint: string; rows: number[][] }[] = [
  { size: "s", name: "Small", hint: "The most art at once", rows: [[3, 2, 4, 2, 3], [2, 4, 3, 3], [4, 2, 2, 3, 2]] },
  { size: "m", name: "Medium", hint: "The usual hang", rows: [[3, 4, 3], [4, 3, 4]] },
  { size: "l", name: "Large", hint: "Fewer, bigger pieces", rows: [[5, 4], [4, 5]] },
];

const TINTS = ["bg-sky/45", "bg-lilac/40", "bg-mint/45", "bg-ocean/30", "bg-sky/30", "bg-lilac/25"];

export function TileSizeSetting() {
  const size = useTileSize();
  return (
    <fieldset>
      <legend className="sr-only">Tile size on Explore</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {SIZES.map((option, index) => (
          <label key={option.size} className={card}>
            <input
              type="radio"
              name="settings-wall"
              value={option.size}
              checked={size === option.size}
              onChange={() => chooseTileSize(option.size)}
              className="peer sr-only"
            />
            {/* A little salon wall: justified rows of pieces on their mats. */}
            <span aria-hidden className="grid h-[5.5rem] gap-1 overflow-hidden rounded-[12px] border border-border bg-canvas p-1.5">
              {option.rows.map((row, r) => (
                <span key={r} className="flex min-h-0 gap-1">
                  {row.map((grow, i) => (
                    <span key={i} className={`rounded-[3px] ${TINTS[(r * 2 + i + index) % TINTS.length]}`} style={{ flexGrow: grow }} />
                  ))}
                </span>
              ))}
            </span>
            <Tick />
            <span className="block px-1.5 pt-2.5 pb-1">
              <span className="block font-display text-sm font-bold text-ink">{option.name}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
