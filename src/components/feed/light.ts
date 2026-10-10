/** The fixed ambient layer the feed lights with the artwork in view. */
export const FEED_LIGHT_ID = "feed-light";

export type LightStop = {
  /** DOM id of the post. */
  id: string;
  /** Colors that light the room, most vivid first (see `glowOf`). */
  glow: string[];
  /** The artwork's palette in order of prominence, drawn on the rail. */
  swatches: string[];
  label: string;
};
