/**
 * Customization rules: the bio box and button colors, what's free and what's
 * Flow+, text that reads on a picked color, color codes (HEX / RGB), and
 * lettering (gradients, effects and their colors) on the name and the board.
 * Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { blockSchema, boardColors, boardPaidFeatures, boardSchema, titleLook, type TextualBlock } from "./about.ts";
import { contrast, readableOn } from "./contrast.ts";
import { hexToRgb, parseColor, rgbToHex } from "./hex.ts";
import { customizationSchema, gateCustomization, paidFieldsUsed, readCustomization } from "./model.ts";
import { letteringStyle } from "./text-fx.ts";

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

describe("color codes: HEX and RGB", () => {
  test("RGB in, HEX out (and back)", () => {
    assert.equal(parseColor("rgb(255, 57, 72)"), "#ff3948");
    assert.equal(parseColor("rgb(255 57 72)"), "#ff3948");
    assert.equal(parseColor("255, 57, 72"), "#ff3948");
    assert.equal(parseColor("#FF3948"), "#ff3948");
    assert.deepEqual(hexToRgb("#ff3948"), [255, 57, 72]);
    assert.equal(rgbToHex(300, -4, 72.4), "#ff0048");
  });

  test("refuses what isn't a color", () => {
    assert.equal(parseColor("rgb(256, 0, 0)"), null);
    assert.equal(parseColor("255, 57"), null);
    assert.equal(parseColor("red"), null);
    assert.equal(parseColor("abc"), null);
    assert.equal(parseColor("abc", { short: true }), "#aabbcc");
  });
});

describe("lettering (name and board text)", () => {
  test("a gradient and an effect with its color become classes and variables", () => {
    const { className, style } = letteringStyle({ gradient: ["#ff7aa8", "#c04dff"], effect: "glow", effectColor: "#ffd166" });
    assert.equal(className, "name-gradient name-glow");
    assert.equal((style as Record<string, string>)["--fx-color"], "#ffd166");
    assert.match((style as Record<string, string>)["--name-gradient"], /#ff7aa8, #c04dff, #ff7aa8/);
  });

  test("no effect, no effect color", () => {
    const { className, style } = letteringStyle({ effect: "none", effectColor: "#ffd166" });
    assert.equal(className, "");
    assert.deepEqual(style, {});
  });

  const block = blockSchema.parse({
    id: "blk-1", x: 0, y: 0, w: 300, h: 200,
    type: "text", title: "About me", text: "Hi!",
    gradient: ["#ff7aa8", "#c04dff"], effect: "glow", effectColor: "#ffd166",
  }) as TextualBlock;

  test("a title's gradient and effect are its own, never the text's", () => {
    const look = titleLook(block);
    assert.equal(look.gradient, undefined);
    assert.equal(look.effect, "none");
    const lettered = titleLook({ ...block, titleStyle: { effect: "outline", effectColor: "#173b5b" } });
    assert.equal(lettered.effect, "outline");
    assert.equal(lettered.effectColor, "#173b5b");
  });

  test("on the board, gradients and effects past the glow are Flow+; colors aren't", () => {
    const board = (blocks: unknown[]) => boardSchema.parse({ blocks });
    assert.deepEqual(boardPaidFeatures(board([{ ...block, gradient: undefined, effect: "glow" }]), 10), []);
    assert.deepEqual(boardPaidFeatures(board([block]), 10), ["gradient text"]);
    assert.deepEqual(boardPaidFeatures(board([{ ...block, gradient: undefined, titleStyle: { effect: "shimmer" } }]), 10), ["text effects"]);
  });

  test("the board offers its gradient stops and effect colors again", () => {
    const colors = boardColors(boardSchema.parse({ blocks: [block] }));
    assert.ok(["#ff7aa8", "#c04dff", "#ffd166"].every((c) => colors.includes(c)));
  });
});
