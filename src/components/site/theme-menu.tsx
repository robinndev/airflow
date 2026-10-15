"use client";

import { Check, Droplet, Flame, MonitorSmartphone } from "lucide-react";
import { useSyncExternalStore, type ChangeEvent } from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  THEMES,
  resolveTheme,
  type Theme,
  type ThemePreference,
} from "@/lib/theme";
import { HeaderMenu } from "./header-menu";

// <html data-theme-preference> is the source of truth (written by the inline
// theme script and by this menu), so subscribe to it instead of duplicating state.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme-preference"] });
  return () => observer.disconnect();
}

const readPreference = () =>
  (document.documentElement.dataset.themePreference as ThemePreference | undefined) ?? DEFAULT_THEME_PREFERENCE;

/** The stored theme preference (null on the server). Also used by Settings → Appearance. */
export const useThemePreference = () => useSyncExternalStore(subscribe, readPreference, () => null);

export function applyPreference(preference: ThemePreference, origin: { x: number; y: number }) {
  const root = document.documentElement;
  const next = resolveTheme(preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode / blocked storage: the choice still applies to this page.
  }

  const swap = () => {
    root.dataset.themePreference = preference;
    root.dataset.theme = next;
  };

  const animate =
    root.dataset.theme !== next &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate) return swap();

  // The new theme grows out of the option that was picked (see globals.css).
  root.style.setProperty("--theme-x", `${origin.x}px`);
  root.style.setProperty("--theme-y", `${origin.y}px`);
  document.startViewTransition(swap);
}

const trigger =
  "relative grid size-10 place-items-center rounded-full bg-surface/75 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface aria-expanded:bg-surface group-data-[solid=true]/header:bg-ice/80 group-data-[solid=true]/header:shadow-none group-data-[solid=true]/header:hover:bg-ice [&_svg]:size-[1.125rem]";

export function ThemeMenu() {
  const preference = useThemePreference();

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const rect = event.currentTarget.parentElement!.getBoundingClientRect();
    applyPreference(event.currentTarget.value as ThemePreference, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <HeaderMenu
      label="Theme"
      panelClassName="sm:w-[25rem]"
      triggerClassName={trigger}
      trigger={
        // CSS picks the icon, so the server render never mismatches the stored theme.
        <>
          <Droplet aria-hidden className="text-ocean dark:hidden" />
          <Flame aria-hidden className="hidden text-ocean dark:block" />
        </>
      }
    >
      <fieldset className="rounded-[20px] border border-border bg-surface p-4 shadow-lift">
        <legend className="sr-only">Theme</legend>
        <p aria-hidden className="font-display text-base font-bold text-ink">
          Theme
        </p>
        <p className="mt-0.5 text-xs text-muted">Pick how Artiflow feels. Artist profiles keep their own colors.</p>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          {(Object.keys(THEMES) as Theme[]).map((theme) => (
            <ThemeOption key={theme} theme={theme} checked={preference === theme} onChange={onChange} />
          ))}
        </div>

        <label className="group/system mt-3 flex cursor-pointer items-center gap-3 rounded-[14px] border border-border px-3 py-2.5 transition-colors hover:bg-ice has-checked:border-ocean has-checked:bg-ocean/[0.06] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ocean">
          <input
            type="radio"
            name="theme"
            value="system"
            checked={preference === "system"}
            onChange={onChange}
            className="peer sr-only"
          />
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-ice text-muted peer-checked:bg-ocean peer-checked:text-white [&_svg]:size-4">
            <MonitorSmartphone aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Match my device</span>
            <span className="block text-xs text-muted">Aqua by day, Ember when your device goes dark</span>
          </span>
          <Check aria-hidden className="size-4 shrink-0 text-ocean opacity-0 peer-checked:opacity-100" />
        </label>
      </fieldset>
    </HeaderMenu>
  );
}

function ThemeOption({
  theme,
  checked,
  onChange,
}: {
  theme: Theme;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const info = THEMES[theme];
  return (
    <label className="group/option relative block cursor-pointer rounded-[16px] p-1.5 ring-1 ring-border transition-[box-shadow,background-color] hover:bg-ice/60 has-checked:ring-2 has-checked:ring-ocean has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ocean">
      <input type="radio" name="theme" value={theme} checked={checked} onChange={onChange} className="peer sr-only" />
      <ThemePreview theme={theme} />
      <span className="absolute -top-1.5 -right-1.5 z-10 grid size-5 scale-75 place-items-center rounded-full bg-ocean text-white opacity-0 shadow-soft transition-[opacity,scale] peer-checked:scale-100 peer-checked:opacity-100">
        <Check aria-hidden className="size-3" strokeWidth={3} />
      </span>
      <span className="block px-1.5 pt-2.5 pb-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold text-ink">{info.name}</span>
          <span className="rounded-full bg-ice px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted">{info.mode}</span>
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{info.mood}</span>
      </span>
    </label>
  );
}

/**
 * A miniature of the platform rendered *in* that theme (the data-theme
 * attribute re-scopes every token), so the preview can never drift from the
 * real palette.
 */
export function ThemePreview({ theme }: { theme: Theme }) {
  const info = THEMES[theme];
  return (
    <span
      data-theme={theme}
      aria-hidden
      className="block overflow-hidden rounded-[12px] border border-border bg-canvas p-2 text-ink"
    >
      <span className="flex items-center justify-between">
        <span className="font-display text-[0.625rem] font-extrabold tracking-tight">Artiflow</span>
        <span className="flex gap-0.5">
          {["bg-ocean", "bg-sky", "bg-mint", "bg-lilac"].map((swatch) => (
            <span key={swatch} className={`size-1.5 rounded-full ${swatch}`} />
          ))}
        </span>
      </span>
      <span className="mt-1.5 flex gap-1.5 rounded-[8px] bg-surface p-1.5 shadow-soft">
        {/* A tiny "artwork": sun over a gradient sky in the theme's colors. */}
        <span
          className="h-11 w-9 shrink-0 rounded-[6px]"
          style={{
            background:
              "radial-gradient(circle at 68% 34%, var(--sky) 0 16%, transparent 17%), radial-gradient(120% 90% at 20% 100%, var(--mint) 0 30%, transparent 31%), linear-gradient(150deg, var(--ocean), var(--lilac))",
          }}
        />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="font-display text-[0.5625rem] leading-tight font-bold">{info.tagline}</span>
          <span className="h-1 w-4/5 rounded-full bg-border" />
          <span className="mt-0.5 inline-flex h-3.5 w-fit items-center rounded-full bg-ocean px-1.5 text-[0.4375rem] font-bold text-white">
            Explore artists
          </span>
        </span>
      </span>
    </span>
  );
}
