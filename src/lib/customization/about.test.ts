/**
 * About board rules: text styles, colors, mirroring. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { blockSchema, boardColors, boardSchema, titleLook, type TextualBlock } from "./about.ts";
import { parseHex } from "./hex.ts";

const box = { id: "blk-1", x: 0, y: 0, w: 300, h: 200 };

function textual(raw: object): TextualBlock {
  const block = blockSchema.parse(raw);
  assert.ok(block.type === "text" || block.type === "list");
  return block;
}

describe("a board saved before titles had their own style", () => {
  const list = textual({ ...box, type: "list", title: "Likes", items: ["Tea"], size: 20, align: "center" });

  test("still parses, with nothing new set", () => {
    assert.equal(list.titleStyle, undefined);
    assert.equal(list.bold, undefined);
    assert.equal(list.leading, undefined);
  });

  test("keeps the old title: display font, extra bold, 1.15× the text, the text's alignment", () => {
    const look = titleLook(list);
    assert.equal(look.font, "display");
    assert.equal(look.bold, true);
    assert.equal(look.italic, false);
    assert.equal(look.size, 23);
    assert.equal(look.align, "center");
    assert.equal(look.color, undefined);
    assert.ok(Math.abs(look.gap - 9.2) < 1e-9);
  });

  test("text blocks need no title", () => {
    const text = textual({ ...box, type: "text", text: "Hi" });
    assert.equal(text.title, undefined);
  });
});

describe("a title styled apart from its text", () => {
  test("uses what the artist set and keeps the rest following the text", () => {
    const list = textual({
      ...box,
      type: "list",
      title: "DNI",
      items: [],
      size: 18,
      font: "sans",
      titleStyle: { font: "hand", size: 40, color: "#ff3948", bold: false },
    });
    const look = titleLook(list);
    assert.equal(look.font, "hand");
    assert.equal(look.size, 40);
    assert.equal(look.color, "#ff3948");
    assert.equal(look.bold, false);
    assert.equal(look.align, "left");
    assert.equal(look.gap, 16);
  });

  test("an explicit gap of 0 sticks", () => {
    const text = textual({ ...box, type: "text", text: "Hi", title: "About me", titleStyle: { gap: 0 } });
    assert.equal(titleLook(text).gap, 0);
  });

  test("out-of-range values are refused", () => {
    assert.equal(blockSchema.safeParse({ ...box, type: "text", text: "", titleStyle: { size: 500 } }).success, false);
    assert.equal(blockSchema.safeParse({ ...box, type: "text", text: "", leading: 9 }).success, false);
    assert.equal(blockSchema.safeParse({ ...box, type: "list", title: "", items: [], markerColor: "red" }).success, false);
  });
});

describe("hex codes typed or pasted into a color field", () => {
  test("take a #, spaces and any case", () => {
    assert.equal(parseHex("#FF3948"), "#ff3948");
    assert.equal(parseHex("  ff3948 "), "#ff3948");
  });

  test("three digits only when the field is left, so typing doesn't jump", () => {
    assert.equal(parseHex("f39"), null);
    assert.equal(parseHex("f39", { short: true }), "#ff3399");
  });

  test("anything else is ignored", () => {
    for (const bad of ["", "#ff394", "ff39488", "gg0000", "red"]) assert.equal(parseHex(bad, { short: true }), null);
  });
});

describe("the colors already on a board", () => {
  test("come from every colored part, once each, in reading order", () => {
    const board = boardSchema.parse({
      background: "#FFF0F6",
      blocks: [
        { ...box, id: "blk-low", y: 400, type: "sticker", sticker: "heart", color: "#ff6fa5" },
        {
          ...box,
          id: "blk-top",
          type: "list",
          title: "Likes",
          items: [],
          color: "#173b5b",
          background: "#fff0f6",
          markerColor: "#ff6fa5",
          titleStyle: { color: "#8b83f6" },
        },
        { ...box, id: "blk-img", y: 800, type: "image", image: { path: "a.png", width: 10, height: 10 } },
      ],
    });
    assert.deepEqual(boardColors(board), ["#fff0f6", "#8b83f6", "#173b5b", "#ff6fa5"]);
  });

  test("leave out transparent cards and boards", () => {
    const board = boardSchema.parse({ blocks: [{ ...box, type: "text", text: "", background: "transparent" }] });
    assert.deepEqual(boardColors(board), []);
  });
});

describe("mirroring", () => {
  test("images and stickers can be flipped; older blocks aren't", () => {
    const sticker = blockSchema.parse({ ...box, type: "sticker", sticker: "star", mirror: true });
    assert.equal(sticker.type === "sticker" && sticker.mirror, true);
    const old = blockSchema.parse({ ...box, type: "sticker", sticker: "star" });
    assert.equal(old.type === "sticker" && old.mirror, undefined);
  });
});
