"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Tab = { key: string; label: string; count: number; content: ReactNode };

/**
 * Tabs over prerendered panels (all panels ship in the HTML; switching is
 * instant and needs no request). WAI-ARIA tabs: arrows/Home/End move focus.
 */
export function StudioBoard({ label, tabs }: { label: string; tabs: Tab[] }) {
  const id = useId();
  const [active, setActive] = useState(tabs[0]?.key);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

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
      <div
        role="tablist"
        aria-label={label}
        className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-fit sm:rounded-full sm:border sm:border-border sm:bg-surface sm:p-1"
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
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${id}-panel-${tab.key}`}
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={tab.key !== active}
          className="mt-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
