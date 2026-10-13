/**
 * Which file the image loader fetches for each width. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { originalPathOf, pickVariant, thumbPathOf, withThumb } from "./variants.ts";

const display = "https://x.supabase.co/storage/v1/object/public/art/u1/posts/1b7c0c5e-3f1a-4e57-9b7e-0d8e1c2a3b4c.webp";
const stem = display.replace(/\.webp$/, "");

describe("variants", () => {
  test("thumb and original live beside the display copy, under the same name", () => {
    assert.equal(thumbPathOf("u1/posts/abc.webp", { type: "image/webp" }), "u1/posts/abc.thumb.webp");
    assert.equal(thumbPathOf("u1/posts/abc.png", { type: "image/jpeg" }), "u1/posts/abc.thumb.jpg");
    assert.equal(originalPathOf("u1/posts/abc.webp", { type: "image/png" }), "u1/posts/abc.png");
  });

  test("small widths get the thumb, larger ones the display copy", () => {
    const src = withThumb(display, { width: 683, type: "image/webp" });
    assert.equal(src, `${display}#thumb=683.webp`);
    assert.equal(pickVariant(src, 384), `${stem}.thumb.webp#w=384`);
    assert.equal(pickVariant(src, 640), `${stem}.thumb.webp#w=640`);
    assert.equal(pickVariant(src, 750), `${display}#w=750`);
    assert.equal(pickVariant(src, 3840), `${display}#w=3840`);
  });

  test("without a thumb, every width gets the display copy (one file for the CDN to cache)", () => {
    assert.equal(withThumb(display, null), display);
    for (const width of [64, 640, 1920]) assert.equal(pickVariant(display, width), `${display}#w=${width}`);
  });

  test("demo art has a thumb beside every file", () => {
    assert.equal(pickVariant("/demo-art/pool/123.jpg", 640), "/demo-art/pool/123.thumb.webp#w=640");
    assert.equal(pickVariant("/demo-art/pool/123.jpg", 1920), "/demo-art/pool/123.jpg#w=1920");
  });

  test("local previews and generated art pass through", () => {
    assert.equal(pickVariant("blob:http://localhost/abc", 640), "blob:http://localhost/abc");
    assert.equal(pickVariant("data:image/png;base64,AAAA", 640), "data:image/png;base64,AAAA");
    assert.equal(pickVariant("/defaults/avatar/mira.svg", 128), "/defaults/avatar/mira.svg#w=128");
  });
});
