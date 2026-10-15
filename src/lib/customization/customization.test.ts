/**
 * Customization rules: the bio box and button colors, what's free and what's
 * Flow+, and text that reads on a picked color. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { contrast, readableOn } from "./contrast.ts";
import { customizationSchema, gateCustomization, paidFieldsUsed, readCustomization } from "./model.ts";

const dressed = customizationSchema.parse({
  buttons: { shape: "pill", secondary: "#fde3ec", soft: "#2b1d3a" },
  bio: { box: true, color: "#1a1636" },
});

describe("bio box and button colors", () => {
  test("older saves read with no box and no button colors", () => {
    const old = readCustomization({ buttons: { shape: "pill", style: "solid" } });
    assert.deepEqual(old.bio, { box: false });
    assert.equal(old.buttons.secondary, undefined);
    assert.equal(old.buttons.soft, undefined);
  });

  test("free accounts keep the box (it's for readability) but not its color or the button colors", () => {
    const free = gateCustomization(dressed, false);
    assert.deepEqual(free.bio, { box: true });
    assert.equal(free.buttons.secondary, undefined);
    assert.equal(free.buttons.soft, undefined);
    assert.deepEqual(gateCustomization(dressed, true), dressed);
  });

  test("saving names the Flow+ fields in use", () => {
    const used = paidFieldsUsed(dressed);
    assert.ok(used.includes("button colors"));
    assert.ok(used.includes("a bio box color"));
    assert.ok(!paidFieldsUsed(customizationSchema.parse({ bio: { box: true } })).some((field) => field.includes("bio")));
  });

  test("colors must be #rrggbb", () => {
    assert.equal(customizationSchema.safeParse({ buttons: { secondary: "red; position: fixed" } }).success, false);
    assert.equal(customizationSchema.safeParse({ bio: { box: true, color: "url(x)" } }).success, false);
  });
});

describe("readableOn", () => {
  const sakura = { ink: "#5a2236", surface: "#ffffff" };

  test("uses the palette's own ink or card color when it reads", () => {
    assert.equal(readableOn("#fde3ec", sakura), sakura.ink);
    assert.equal(readableOn("#2b1d3a", sakura), sakura.surface);
  });

  test("falls back to near-black or white when the palette's colors don't stand out", () => {
    const text = readableOn("#8b83f6", { ink: "#6f68d8", surface: "#a59ff8" });
    const clearer = contrast("#8b83f6", "#ffffff") > contrast("#8b83f6", "#141414") ? "#ffffff" : "#141414";
    assert.equal(text, clearer);
  });

  test("works with no palette (the profile follows the site theme)", () => {
    assert.equal(readableOn("#ffffff", null), "#141414");
    assert.equal(readableOn("#0b101c", null), "#ffffff");
  });
});
