/*
 * One toast at a time, raised from anywhere on the page (save buttons, the
 * moodboard) and shown by <FavoritesToast> in the site layout.
 */

export type Toast = {
  message: string;
  link?: { label: string; href: string };
  undo?: () => void;
};

export const TOAST_EVENT = "artiflow:toast";

export function showToast(toast: Toast) {
  window.dispatchEvent(new CustomEvent<Toast>(TOAST_EVENT, { detail: toast }));
}
