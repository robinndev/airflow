/**
 * Palette helpers. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { averageOf, blendPalettes } from "./palette.ts";

describe("blendPalettes", () => {
  test("pools near-identical colors and keeps the ones a collection repeats", () => {
    const blended = blendPalettes(
      [
        ["#1f6eae", "#f8b45a", "#ffffff"],
        ["#2070b0", "#e9783e"],
        ["#1e6dad", "#c44e33"],
      ],
      2,
    );
    // Three near-identical blues pool into one, which outweighs every single warm color.
    assert.equal(blended.length, 2);
    assert.equal(blended.filter((hex) => hex.startsWith("#1f6e")).length, 1);
  });

  test("returns its colors light to dark", () => {
    const blended = blendPalettes([["#0d0e20", "#fde6f0", "#86d3ef"]]);
    assert.deepEqual(blended, ["#fde6f0", "#86d3ef", "#0d0e20"]);
  });

  test("ignores anything that isn't a hex color", () => {
    assert.deepEqual(blendPalettes([["red;position:fixed", "url(x)", "#ABCDEF"]]), ["#abcdef"]);
    assert.deepEqual(blendPalettes([]), []);
  });
});

describe("averageOf", () => {
  test("mixes by rank, so a light picture with a dark lead swatch stays light", () => {
    // Pale tulips over dark leaves: the leaves lead the palette, but the mix is far lighter.
    const mixed = averageOf(["#3e4b35", "#90899c", "#e5d1c6", "#1e2519", "#d28b9c"])!;
    const lightness = Number.parseInt(mixed.slice(1, 3), 16);
    assert.ok(lightness > 0x80, `${mixed} should read lighter than the leaves`);
  });

  test("returns a single swatch as it is", () => {
    assert.equal(averageOf(["#86d3ef"]), "#86d3ef");
  });

  test("ignores anything that isn't a hex color", () => {
    assert.equal(averageOf(["url(x)", "#ffffff"]), "#ffffff");
    assert.equal(averageOf([]), undefined);
    assert.equal(averageOf(), undefined);
  });
});
