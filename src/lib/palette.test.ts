/**
 * Palette helpers. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { blendPalettes } from "./palette.ts";

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
