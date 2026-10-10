"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type HeaderMenuProps = {
  /** Accessible name for the trigger button. */
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  /** Width/extra classes for the panel on sm+ screens. */
  panelClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
};

/**
 * Header dropdown that opens and closes on click, and closes on Esc, outside
 * clicks, focus leaving, or picking a link. Any click outside closes it, so
 * opening another header menu (or the account popover) leaves only one open.
 * The panel stays mounted but `inert` while closed.
 */
export function HeaderMenu({
  label,
  trigger,
  triggerClassName,
  panelClassName = "sm:w-[26rem]",
  children,
}: HeaderMenuProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      // Close when focus moves to something outside (e.g. Tab). A null
      // relatedTarget means a click on non-focusable panel content (labels,
      // text) — outside clicks are already handled by the pointerdown listener.
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {/* pt-2 spaces the panel from the button. */}
      <div
        id={panelId}
        inert={!open}
        data-open={open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) close();
        }}
        className={`fixed inset-x-4 top-16 z-50 pt-2 opacity-0 transition-[opacity,translate] duration-150 data-[open=false]:pointer-events-none data-[open=false]:-translate-y-1 data-[open=true]:opacity-100 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 ${panelClassName}`}
      >
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}
