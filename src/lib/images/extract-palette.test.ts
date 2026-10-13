/**
 * Dominant colors on upload. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractPalette } from "./extract-palette.ts";

type Rgba = [number, number, number, number];

/** A size × size image: `inner` in the middle (half the side), `outer` around it. */
function framed(size: number, inner: Rgba, outer: Rgba) {
  const rgb = new Uint8Array(size * size * 3);
  const alpha = new Uint8Array(size * size);
  const lo = size / 4;
  const hi = size - size / 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = x >= lo && x < hi && y >= lo && y < hi ? inner : outer;
      const p = y * size + x;
      rgb.set([r, g, b], p * 3);
      alpha[p] = a;
    }
  }
  return { rgb, alpha };
}

describe("extractPalette", () => {
  test("leaves see-through pixels out, so a transparent PNG isn't mostly black", () => {
    const { rgb, alpha } = framed(16, [220, 40, 60, 255], [0, 0, 0, 0]);
    assert.equal(extractPalette(rgb, 16, 16)[0], "#000000");
    assert.deepEqual(extractPalette(rgb, 16, 16, alpha), ["#dc283c"]);
  });

  test("an image with nothing visible has no colors", () => {
    const { rgb, alpha } = framed(8, [0, 0, 0, 0], [0, 0, 0, 0]);
    assert.deepEqual(extractPalette(rgb, 8, 8, alpha), []);
  });

  test("still drops a flat paper backdrop", () => {
    const { rgb } = framed(16, [30, 90, 200, 255], [250, 248, 240, 255]);
    assert.deepEqual(extractPalette(rgb, 16, 16), ["#1e5ac8"]);
  });

  test("a light outline touching a see-through edge isn't taken for paper", () => {
    // Visible white only on the top row; the rest of the border is transparent.
    const { rgb, alpha } = framed(16, [30, 90, 200, 255], [0, 0, 0, 0]);
    for (let x = 0; x < 16; x++) {
      rgb.set([255, 255, 255], x * 3);
      alpha[x] = 255;
    }
    assert.ok(extractPalette(rgb, 16, 16, alpha).includes("#ffffff"));
  });
});
