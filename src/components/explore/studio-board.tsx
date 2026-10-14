"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { SPECIALTIES, SUBJECTS, drawLabel, isDrawTag, type DrawTag } from "@/lib/profile/draws";

const CHANGE = "explore:draws";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function wantedTag(): DrawTag | null {
  const tag = new URLSearchParams(window.location.search).get("draws");
  return isDrawTag(tag) ? tag : null;
}

type Sheet = { id: string; draws: DrawTag[]; node: ReactNode };
type Tab = { key: string; label: string; sheets: Sheet[] };

/**
 * Commission sheets in tabs, filtered by what the artist draws. All sheets
 * ship prerendered; tabs and the filter only show and hide them, so nothing
 * waits on a request. The filter lives in `?draws=` (profile labels link
 * here), written with replaceState so the page stays static.
 * WAI-ARIA tabs: arrows/Home/End move focus.
 */
export function StudioBoard({ label, tabs }: { label: string; tabs: Tab[] }) {
  const id = useId();
  const [active, setActive] = useState(tabs[0]?.key);
  // The URL is the state: profile labels arrive as /explore/studios?draws=feral#studios.
  const want = useSyncExternalStore(subscribe, wantedTag, () => null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const chipsRef = useRef<HTMLDivElement>(null);

  // On phones the chips scroll sideways: bring the picked one into view (sideways only, never the page).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && chip) row.scrollLeft = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
  }, [want]);

  function pick(tag: DrawTag | null) {
    const url = new URL(window.location.href);
    if (tag) url.searchParams.set("draws", tag);
    else url.searchParams.delete("draws");
    history.replaceState(null, "", url);
    window.dispatchEvent(new Event(CHANGE));
  }

  const all = tabs.flatMap((tab) => tab.sheets);
  // Every subject always (a buyer looks for ferals whether or not anyone's open); specialties once someone offers them.
  const options: DrawTag[] = [
    ...SUBJECTS.map((s) => s.id),
    ...SPECIALTIES.map((s) => s.id).filter((tag) => tag === want || all.some((sheet) => sheet.draws.includes(tag))),
  ];
  const shown = (tab: Tab) => (want ? tab.sheets.filter((sheet) => sheet.draws.includes(want)) : tab.sheets);
  const elsewhere = tabs.filter((tab) => tab.key !== active && shown(tab).length > 0);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(tabs[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p id={`${id}-draws`} className="shrink-0 text-sm font-semibold text-ink">
          Who should they draw?
        </p>
        <div
          ref={chipsRef}
          role="group"
          aria-labelledby={`${id}-draws`}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {[null, ...options].map((tag) => (
            <button
              key={tag ?? "anyone"}
              type="button"
              aria-pressed={want === tag}
              onClick={() => pick(tag)}
              className="h-9 shrink-0 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:text-ink aria-pressed:border-lilac aria-pressed:bg-lilac/15 aria-pressed:text-lilac-ink"
            >
              {tag ? drawLabel(tag) : "Anyone"}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label={label}
        className="-mx-4 mt-5 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-fit sm:rounded-full sm:border sm:border-border sm:bg-surface sm:p-1"
      >
        {tabs.map((tab, i) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                selected ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border hover:text-ink sm:bg-transparent sm:ring-0"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-px text-xs tabular-nums ${selected ? "bg-on-ink/15" : "bg-ice text-muted"}`}
              >
                {shown(tab).length}
              </span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {want ? `${all.filter((sheet) => sheet.draws.includes(want)).length} studios draw ${drawLabel(want).toLowerCase()}` : ""}
      </p>

      {tabs.map((tab) => {
        const sheets = shown(tab);
        return (
          <div
            key={tab.key}
            role="tabpanel"
            id={`${id}-panel-${tab.key}`}
            aria-labelledby={`${id}-tab-${tab.key}`}
            hidden={tab.key !== active}
            className="mt-6"
          >
            {sheets.length > 0 ? (
              <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:gap-y-7 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0 lg:grid-cols-2 lg:gap-x-5">
                {tab.sheets.map((sheet) => (
                  <li key={sheet.id} hidden={!sheets.includes(sheet)} className="w-[88%] shrink-0 snap-start sm:w-auto">
                    {sheet.node}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border px-6 py-12 text-center">
                <p className="font-display text-lg font-bold text-ink">
                  No one here draws {want ? drawLabel(want).toLowerCase() : "that"} right now
                </p>
                <p className="mt-1 text-sm text-muted">
                  {elsewhere.length > 0 ? "But there are studios in another tab:" : "Check back soon, studios open every day."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {elsewhere.map((other) => (
                    <button
                      key={other.key}
                      type="button"
                      onClick={() => setActive(other.key)}
                      className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                    >
                      {other.label} · {shown(other).length}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => pick(null)}
                    className="h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink"
                  >
                    Show everyone
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
