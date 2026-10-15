/*
 * Account settings that change how pages look for you, applied in the
 * browser so pages stay static: `<html data-hide-likes>` hides every
 * `[data-like-count]` (globals.css). The header hands over the saved value
 * (<ViewerPrefs>); a copy in localStorage applies it before first paint.
 */

export const HIDE_LIKES_KEY = "artiflow:hide-likes";

export const viewerPrefsScript = `try{if(localStorage.getItem(${JSON.stringify(HIDE_LIKES_KEY)})==="1")document.documentElement.dataset.hideLikes=""}catch(e){}`;

export function applyHideLikes(hide: boolean) {
  if (hide) document.documentElement.dataset.hideLikes = "";
  else delete document.documentElement.dataset.hideLikes;
  try {
    if (hide) localStorage.setItem(HIDE_LIKES_KEY, "1");
    else localStorage.removeItem(HIDE_LIKES_KEY);
  } catch {
    // Storage blocked: the header applies it on every page anyway.
  }
}
