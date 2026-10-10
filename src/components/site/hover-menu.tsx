"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const CLOSE_DELAY_MS = 140;

type HoverMenuProps = {
  /** Accessible name for the trigger button. */
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  /** Width/extra classes for the panel on sm+ screens. */
  panelClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
};

/**
 * Header dropdown that opens on hover for mouse users (with a short close
 * delay so the pointer can travel into the panel), on click/tap for everyone
 * else, and closes on Esc, outside clicks, focus leaving, or picking a link.
 * The panel stays mounted but `inert` while closed.
 */
export function HoverMenu({
  label,
  trigger,
  triggerClassName,
  panelClassName = "sm:w-[26rem]",
  children,
}: HoverMenuProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef("");
  const [open, setOpen] = useState(false);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
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

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
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
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        // Hover already opened it for mouse users, so a click must not close it.
        onClick={() => {
          if (lastPointer.current === "mouse") show();
          else setOpen((o) => !o);
          lastPointer.current = "";
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {/* pt-2 is an invisible hover bridge between the button and the panel. */}
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
