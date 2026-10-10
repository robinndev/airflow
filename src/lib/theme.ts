/*
 * Platform themes. Both share the same design system and tokens (see
 * globals.css); only the palette, display font and mood change. Artist
 * profiles keep their own customization on top of either theme.
 *
 * The choice lives in localStorage (not a cookie) so every page can stay a
 * static/PPR shell: a tiny inline script applies it before first paint.
 */

export type Theme = "aqua" | "ember";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "artiflow-theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "aqua";

export const THEMES: Record<Theme, { name: string; tagline: string; mood: string; mode: string }> = {
  aqua: {
    name: "Aqua",
    tagline: "Create & explore",
    mood: "Fresh, open, creative",
    mode: "Light",
  },
  ember: {
    name: "Ember",
    tagline: "Fuel your creativity",
    mood: "Bold, expressive, immersive",
    mode: "Dark",
  },
};

/**
 * Runs inline in <head>: resolves the preference to a theme, writes
 * `data-theme` / `data-theme-preference` on <html>, and keeps following the OS
 * (for "system") and other tabs. Keep it dependency-free and tiny.
 */
export const themeScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var p=localStorage.getItem(k);if(p!=="aqua"&&p!=="ember"&&p!=="system")p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};d.dataset.themePreference=p;d.dataset.theme=p==="system"?(m.matches?"ember":"aqua"):p}a();m.addEventListener("change",a);addEventListener("storage",function(e){if(e.key===k)a()})}catch(e){}})();`;

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "ember" : "aqua";
}
