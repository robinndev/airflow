import { formatUsd } from "@/lib/format";
import type { WallItem, WallKind } from "@/lib/wall/query";

/** What each kind of tile is called on its label. */
export const KIND_NAME: Record<WallKind, string> = {
  piece: "Gallery piece",
  post: "Post",
  character: "Character",
  adoptable: "Adoptable",
  commission: "Commission example",
};

/** The short note a tile carries (and screen readers hear): price, stage, species. */
export function noteOf(item: WallItem): string | null {
  switch (item.kind) {
    case "adoptable":
      if (item.status === "adopted") return "Adopted";
      if (item.status === "reserved") return "Adoptable, reserved";
      return item.priceUsd !== undefined ? `Adoptable, ${formatUsd(item.priceUsd)}` : "Adoptable";
    case "commission":
      return item.priceUsd !== undefined ? `Commission from ${formatUsd(item.priceUsd)}` : "Commission";
    case "character":
      return item.subtitle ? `Character, ${item.subtitle}` : "Character";
    case "post":
      return item.stage === "wip" ? "Work in progress" : item.stage === "sketch" ? "Sketch" : null;
    case "piece":
      return null;
  }
}

/** Where the viewer's main button leads, in words. */
export function actionOf(item: WallItem): string {
  switch (item.kind) {
    case "piece":
      return "View in their gallery";
    case "post":
      return "See the post";
    case "character":
      return `Open ${item.title}'s ref sheet`;
    case "adoptable":
      return "See the adoption sheet";
    case "commission":
      return "See prices & request";
  }
}
