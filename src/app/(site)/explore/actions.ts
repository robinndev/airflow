"use server";

import { getWallCatalog } from "@/lib/wall/catalog";
import { WALL_PAGE, parseWall, runWall, type WallItem } from "@/lib/wall/query";

/*
 * The wall's next page, as the page itself would have filtered it (the same
 * query string, over the same cached catalog). Public: anyone can read the
 * wall, so there is nothing to check but the input.
 */

export type WallPage = { items: WallItem[]; more: boolean };

const MAX_OFFSET = 5000;

export async function loadWallPage(query: string, offset: number): Promise<WallPage> {
  if (typeof query !== "string" || query.length > 500) return { items: [], more: false };
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) return { items: [], more: false };

  const params = parseWall(Object.fromEntries(new URLSearchParams(query)));
  const { entries, now } = await getWallCatalog();
  const found = runWall(entries, params, now);
  return {
    items: found.slice(offset, offset + WALL_PAGE).map((entry) => entry.item),
    more: found.length > offset + WALL_PAGE && offset + WALL_PAGE < MAX_OFFSET,
  };
}
