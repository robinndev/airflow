"use client";

import { Kanban, Rows3, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { showToast } from "@/components/favorites/toast-events";
import type { ViewerQueue } from "@/lib/commissions/queries";
import {
  countTabs,
  inTab,
  isTab,
  LANE_INFO,
  matches,
  moveTo,
  STEP_LABEL,
  TABS,
  type Lane,
  type NextAction,
  type OrderPatch,
  type QueueOrder,
  type Step,
  type Tab,
} from "@/lib/commissions/queue";
import { Board } from "./board";
import { Ledger } from "./ledger";
import { OPEN_ORDER_EVENT } from "./open-order";
import { OrderDrawer } from "./order-drawer";
import { undoLast, updateOrder, useQueue } from "./store";

type View = "board" | "ledger";

const TAB_DOT: Record<Tab, string> = {
  all: "bg-ink",
  attention: "bg-ocean",
  client: "bg-sky",
  waitlist: "bg-lilac",
  paused: "bg-muted",
  delivered: "bg-star",
  archived: "bg-muted/50",
};

const nameOf = (order: QueueOrder) => `${order.client.name}'s ${order.service.toLowerCase()}`;

/**
 * The work area under the masthead: binder tabs that filter the queue, a
 * search, and the same orders as a board (tickets on the cutting mat) or a
 * ledger (one ruled page). Tab and view live in the URL (?tab=, ?view=).
 */
export function QueueWorkspace({ queue }: { queue: ViewerQueue }) {
  const { orders, last } = useQueue(queue);
  const params = useSearchParams();
  const tab: Tab = isTab(params.get("tab")) ? (params.get("tab") as Tab) : "all";
  const view: View = params.get("view") === "ledger" ? "ledger" : "board";
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const open = (event: Event) => setOpenId((event as CustomEvent<string>).detail);
    window.addEventListener(OPEN_ORDER_EVENT, open);
    return () => window.removeEventListener(OPEN_ORDER_EVENT, open);
  }, []);

  // Shallow URL update: Next keeps useSearchParams in sync with history.replaceState
  // (state must be null; Next ignores calls that carry its own history state).
  function setParam(key: "tab" | "view", value: string, fallback: string) {
    const url = new URL(window.location.href);
    if (value === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    window.history.replaceState(null, "", url);
  }

  const counts = countTabs(orders);
  const shown = orders.filter((order) => inTab(order, tab) && matches(order, query));
  const opened = orders.find((order) => order.id === openId) ?? null;

  function change(order: QueueOrder, patch: OrderPatch, message: string) {
    updateOrder(order.id, patch, message);
    showToast({ message, undo: undoLast });
  }

  function move(id: string, lane: Lane) {
    const order = orders.find((o) => o.id === id);
    if (!order || order.lane === lane) return;
    const message =
      lane === "delivered" ? `Delivered ${nameOf(order)} ✓` : `${nameOf(order)} → ${LANE_INFO[lane].label}`;
    change(order, moveTo(order, lane, new Date()), message);
  }

  function step(id: string, next: Step) {
    const order = orders.find((o) => o.id === id);
    if (!order || order.step === next) return;
    change(order, { step: next }, `${nameOf(order)}: ${STEP_LABEL[next].toLowerCase()}`);
  }

  function act(order: QueueOrder, action: NonNullable<NextAction>) {
    switch (action.kind) {
      case "review":
        return setOpenId(order.id);
      case "start":
        return move(order.id, "wip");
      case "step":
        return step(order.id, action.step);
      case "deliver":
        return move(order.id, "delivered");
      case "resume":
        return change(order, { paused: false }, `Resumed ${nameOf(order)}`);
    }
  }

  return (
    <div>
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-end lg:justify-between">
        <IndexTabs
          tab={tab}
          counts={counts}
          surface={view === "board" ? "bg-ice" : "bg-surface"}
          onChange={(next) => setParam("tab", next, "all")}
        />
        <div className="flex items-center gap-2 lg:pb-2">
          <SearchField value={query} onChange={setQuery} />
          <div role="group" aria-label="View" className="flex shrink-0 rounded-full bg-ice p-1">
            {(
              [
                { id: "board", label: "Board", icon: Kanban },
                { id: "ledger", label: "Ledger", icon: Rows3 },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setParam("view", id, "board")}
                className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${
                  view === id ? "bg-ink text-on-ink" : "text-muted hover:text-ink"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id="queue-panel"
        aria-labelledby={`queue-tab-${tab}`}
        className={`relative rounded-panel rounded-tl-none border border-border shadow-soft ${
          view === "board" ? "mat-grid bg-ice p-4 pt-6 sm:p-6 sm:pt-7" : "overflow-hidden bg-surface"
        }`}
      >
        {view === "board" ? (
          <Board
            orders={shown}
            today={queue.today}
            freshId={last?.id ?? null}
            onOpen={setOpenId}
            onMove={move}
            onStep={step}
          />
        ) : (
          <Ledger orders={shown} today={queue.today} onOpen={setOpenId} onAction={act} />
        )}
        {query && shown.length === 0 && (
          <p className="pb-6 text-center text-sm text-muted">
            Nothing matches &ldquo;{query}&rdquo; in {TABS.find((t) => t.id === tab)!.label}.
          </p>
        )}
      </div>

      <OrderDrawer
        order={opened}
        today={queue.today}
        onClose={() => setOpenId(null)}
        onMove={move}
        onStep={step}
        onAction={act}
        onPatch={change}
      />
    </div>
  );
}

/** Binder index tabs sticking up from the panel's top edge; arrow keys move between them. */
function IndexTabs({
  tab,
  counts,
  surface,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number>;
  surface: string;
  onChange: (tab: Tab) => void;
}) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  function onKeyDown(event: KeyboardEvent) {
    const at = TABS.findIndex((t) => t.id === tab);
    const to = event.key === "ArrowRight" ? at + 1 : event.key === "ArrowLeft" ? at - 1 : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null;
    if (to === null) return;
    event.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length].id;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div role="tablist" aria-label="Filter commissions" onKeyDown={onKeyDown} className="flex h-11 w-max items-end gap-1">
        {TABS.map(({ id, label }) => {
          const current = id === tab;
          const count = counts[id];
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              id={`queue-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={current}
              aria-controls="queue-panel"
              tabIndex={current ? 0 : -1}
              onClick={() => onChange(id)}
              className={`relative flex items-center gap-2 rounded-t-[14px] border border-b-0 px-3.5 text-sm font-semibold whitespace-nowrap transition-[height,background-color,color] duration-200 ${
                current
                  ? `z-10 -mb-px h-11 border-border ${surface} font-display font-bold text-ink`
                  : "h-9 border-border/70 bg-surface/60 text-muted hover:h-10 hover:text-ink"
              }`}
            >
              <span aria-hidden className={`size-2 rounded-full ${TAB_DOT[id]} ${current ? "" : "opacity-60"}`} />
              {label}
              {id !== "archived" && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 font-bold tabular-nums ${
                    id === "attention" && count > 0 ? "bg-ocean text-white" : "bg-ink/[0.07] text-ink/70"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center lg:w-60 lg:flex-none">
      <span className="sr-only">Search commissions</span>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Client, character or No."
        className="h-10 w-full rounded-full border border-border bg-surface pr-9 pl-10 text-sm text-ink placeholder:text-muted focus:border-ocean focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 grid size-7 place-items-center rounded-full text-muted hover:bg-ice hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </label>
  );
}
