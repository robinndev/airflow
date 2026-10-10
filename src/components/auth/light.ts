/** The fixed `ambient-light` layer behind the auth desk. */
export const DESK_LIGHT_ID = "desk-light";

/**
 * Re-lights the desk with these colors (an artwork's `glowOf`), or back to
 * the theme's defaults when there are none. Same registered properties as the
 * home feed, so the change eases in CSS.
 */
export function lightDesk(colors?: string[] | null) {
  const layer = document.getElementById(DESK_LIGHT_ID);
  if (!layer) return;
  ["a", "b", "c"].forEach((slot, i) => {
    if (colors?.length) layer.style.setProperty(`--light-${slot}`, colors[i % colors.length]);
    else layer.style.removeProperty(`--light-${slot}`);
  });
}
