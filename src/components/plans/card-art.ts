import type { PlanId } from "@/lib/plans";
import { demoImages } from "@/lib/profile/demo-images";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * DEMO art on the catalog cards: third-party pieces (see demo-images.ts),
 * credited like the illustrator on a trading card. Swap for work from
 * consenting artists before launch, with the rest of the demo art.
 */

// "https://danbooru.donmai.us/posts/123 (artist_(alias))" → "artist_(alias)"
const illustrator = (source: string) => source.match(/^\S+\s+\((.+)\)$/)?.[1] ?? "unknown";

const card = (image: ImageAsset & { source: string }, focus: string) => ({
  image,
  focus,
  credit: `Illus. ${illustrator(image.source)}`,
});

export const CARD_ART: Record<PlanId, { image: ImageAsset; focus: string; credit: string }> = {
  // Free: an OC on a clean sheet, the way most portfolios start.
  free: card(demoImages.pinkBunny, "50% 24%"),
  // Flow+: a scene that shines, for the foil.
  flow_plus: card(demoImages.sunsetReflection, "50% 58%"),
  // Live: friends around a fire, the community you draw for.
  live: card(demoImages.campfire, "50% 32%"),
};
