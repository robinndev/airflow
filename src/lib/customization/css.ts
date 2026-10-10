import { CSS_MAX } from "./model";

/*
 * Custom CSS (Flow+). Artists write normal CSS; it only ever applies inside
 * their profile canvas:
 *
 * - Validated on save: no @import/@font-face/@namespace, no escapes or
 *   markup, no scriptable values, and url() only for our own art storage or
 *   inline images — so a profile can't load third-party resources (tracking)
 *   or smuggle markup out of the <style> element.
 * - Wrapped in `@scope` at render time, so selectors can't reach the header,
 *   menus or anything outside the profile.
 * - The canvas has `contain: paint` + `isolation: isolate`: even
 *   `position: fixed` or a huge z-index stays clipped inside the profile and
 *   can't cover site chrome (e.g. a fake sign-in box).
 */

export type CssCheck = { ok: true; css: string } | { ok: false; error: string };

const FORBIDDEN: [RegExp, string][] = [
  [/\\/, "Escape sequences (\\) aren't allowed."],
  [/@import|@charset|@namespace|@font-face|@layer|@property/i, "That @-rule isn't allowed in profile CSS."],
  [/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding/i, "Scriptable CSS isn't allowed."],
  [/image-set\s*\(|-webkit-image-set\s*\(|src\s*\(/i, "Use url() for images."],
];

/** Checks custom CSS and returns it trimmed, or a human reason it can't be saved. */
export function checkCustomCss(input: string, artBaseUrl: string): CssCheck {
  const css = input.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!css) return { ok: true, css: "" };
  if (css.length > CSS_MAX) return { ok: false, error: `Keep custom CSS under ${CSS_MAX.toLocaleString("en-US")} characters.` };

  // `>` is fine as a child combinator in selectors; `<` never is.
  if (css.includes("<")) return { ok: false, error: "Markup characters (<) aren't allowed in profile CSS." };
  for (const [pattern, message] of FORBIDDEN) {
    if (pattern.test(css)) return { ok: false, error: message };
  }

  const urls = [...css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)];
  // Anything url()-like the pattern didn't parse is refused rather than guessed at.
  if (urls.length !== (css.match(/url\s*\(/gi)?.length ?? 0)) {
    return { ok: false, error: "Write images as url(\"…\") with a plain address." };
  }
  for (const match of urls) {
    const target = match[2].trim();
    const inlineImage = /^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i.test(target);
    const ownStorage = target.startsWith(`${artBaseUrl}/`);
    if (!inlineImage && !ownStorage) {
      return { ok: false, error: "Images in CSS must be uploaded to Artiflow (or inline data: images)." };
    }
  }

  let depth = 0;
  for (const char of css) {
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth < 0) return { ok: false, error: "There's a } without a matching {." };
  }
  if (depth !== 0) return { ok: false, error: "A { is never closed." };

  return { ok: true, css };
}

/** What the profile actually injects: the checked CSS, scoped to one profile canvas. */
export function scopeCustomCss(css: string, handle: string) {
  const safeHandle = handle.replace(/[^a-z0-9_.]/g, "");
  return `@scope ([data-profile-canvas="${safeHandle}"]) {\n${css}\n}`;
}
