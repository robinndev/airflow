"use client";

import { useSyncExternalStore } from "react";

/*
 * How new messages announce themselves, per browser: the studio chime (on by
 * default) and desktop alerts while the tab is in the background (off until
 * the viewer turns them on and the browser allows it). Kept in localStorage,
 * so every tab follows a change.
 */

export type AlertPrefs = { sound: boolean; desktop: boolean };

const KEY = "artiflow-message-alerts";
const DEFAULTS: AlertPrefs = { sound: true, desktop: false };

let prefs: AlertPrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function read(): AlertPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return { ...DEFAULTS, ...(saved && typeof saved === "object" ? saved : {}) };
  } catch {
    return DEFAULTS;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  prefs = read();
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    prefs = read();
    for (const listener of listeners) listener();
  });
}

export function getAlertPrefs() {
  load();
  return prefs;
}

export function setAlertPrefs(next: Partial<AlertPrefs>) {
  load();
  prefs = { ...prefs, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: the choice lasts for this page.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAlertPrefs() {
  return useSyncExternalStore(subscribe, getAlertPrefs, () => DEFAULTS);
}
