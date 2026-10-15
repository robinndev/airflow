/**
 * The supply shop's catalog and ownership rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  KIND_ORDER,
  SHOP_ITEMS,
  STICKER_PACKS,
  itemKey,
  itemOf,
  itemsOf,
  packOfSticker,
  packStickersOwned,
  pickMonth,
  unownedInUse,
} from "./catalog.ts";

describe("the catalog", () => {
  test("every aisle has stock, and at least one free thing to take", () => {
    for (const kind of KIND_ORDER) {
      assert.ok(itemsOf(kind).length > 0, kind);
      assert.ok(itemsOf(kind).some((item) => item.priceUsd === 0), `${kind} has a free item`);
    }
  });

  test("ids are unique within an aisle and fit the database's check", () => {
    const keys = SHOP_ITEMS.map(itemKey);
    assert.equal(new Set(keys).size, keys.length);
    for (const item of SHOP_ITEMS) assert.match(item.id, /^[a-z0-9-]{2,40}$/);
  });

  test("sticker packs name their stickers, and each sticker has one pack", () => {
    for (const pack of itemsOf("stickers")) assert.ok(STICKER_PACKS[pack.id as keyof typeof STICKER_PACKS]);
    assert.equal(packOfSticker("rocket"), "space");
    assert.equal(packOfSticker("heart"), undefined);
  });
});

describe("what you can wear", () => {
  const none = new Set<string>();

  test("free items and owned ones are fine; paid ones you don't own aren't", () => {
    assert.deepEqual(unownedInUse({ frame: "sakura", effect: "petals", nameFx: "wave", coverFx: "sunbeams", pin: "brush" }, [], none), []);
    assert.deepEqual(unownedInUse({ effect: "starfall", pin: "coffee" }, [], none), ["Starfall", "Fueled by Coffee"]);
    assert.deepEqual(unownedInUse({ effect: "starfall" }, [], new Set(["effect:starfall"])), []);
  });

  test("an id that left the catalog is refused", () => {
    assert.equal(unownedInUse({ nameFx: "sparkly-old" }, [], none).length, 1);
  });

  test("board stickers need their pack (built-in stickers and free packs don't)", () => {
    assert.deepEqual(unownedInUse({}, ["heart", "coffee"], none), []);
    assert.deepEqual(unownedInUse({}, ["rocket", "comet", "pixel-heart"], none), ["the Space Cadet stickers", "the Pixel Pack stickers"]);
    assert.deepEqual(unownedInUse({}, ["rocket"], new Set(["stickers:space"])), []);
    assert.deepEqual(packStickersOwned(new Set(["stickers:pixel"])), ["coffee", "croissant", "teacup", "cake", "pixel-heart", "pixel-star", "pixel-sword", "pixel-potion"]);
  });
});

describe("Flow+'s monthly pick", () => {
  test("is filed under the first day of its month (UTC)", () => {
    assert.equal(pickMonth(new Date(Date.UTC(2026, 9, 15, 2))), "2026-10-01");
    assert.equal(pickMonth(new Date(Date.UTC(2026, 11, 31, 23, 59))), "2026-12-01");
  });

  test("finds items by aisle and id", () => {
    assert.equal(itemOf("cover", "holo")?.name, "Holo Sheen");
    assert.equal(itemOf("cover", "nope"), undefined);
    assert.equal(itemOf("frame", null), undefined);
  });
});
