"use client";

import { useSyncExternalStore } from "react";

/*
 * Keyboard shortcuts in the customizer, written the way each computer shows
 * them: "⌘Z" on Apple devices, "Ctrl+Z" elsewhere (Ctrl until hydrated).
 */

const noChanges = () => () => {};
const onApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export function useShortcutLabel() {
  const apple = useSyncExternalStore(noChanges, onApple, () => false);
  return (key: string, { shift = false } = {}) => (apple ? `${shift ? "⇧" : ""}⌘${key}` : `Ctrl+${shift ? "Shift+" : ""}${key}`);
}

/** Fields that have their own undo (typing); everywhere else ⌘Z / Ctrl+Z undoes the board. */
export function isTextField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && ["text", "search", "url", "email", "tel", "number", "password"].includes(target.type);
}
