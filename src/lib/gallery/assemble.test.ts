/**
 * Gallery rules: addresses, tags, and how stored rows become pages.
 * Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assembleGallery, galleryIndex, type CharacterRecord } from "./assemble.ts";
import { cleanList, sectionsOf, slugify, uniqueSlug, type Piece } from "./types.ts";

const piece = (id: string, createdAt: string, palette: string[] = ["#112233"]): Piece => ({
  id,
  ownerHandle: "luna.art",
  title: id,
  image: { src: `/${id}.png`, alt: id, width: 10, height: 10, palette },
  kind: "personal",
  likes: 0,
  createdAt,
});

const character = (overrides: Partial<CharacterRecord> = {}): CharacterRecord => ({
  id: "chr_1",
  ownerHandle: "luna.art",
  slug: "luna",
  name: "Luna",
  tagline: "",
  species: "",
  pronouns: "",
  story: "",
  traits: [],
  tags: [],
  palette: [],
  art: [],
  createdAt: "2026-10-01",
  ...overrides,
});

describe("addresses", () => {
  test("slugify keeps letters and digits, joined by dashes", () => {
    assert.equal(slugify("Kinako's Winter coat!"), "kinako-s-winter-coat");
    assert.equal(slugify("  Ève — 2nd form  "), "eve-2nd-form");
    assert.equal(slugify("✨✨"), "");
  });

  test("slugs are never longer than 40", () => {
    assert.ok(slugify("a".repeat(30) + " " + "b".repeat(30)).length <= 40);
    assert.ok(!slugify("a".repeat(39) + " bb").endsWith("-"));
  });

  test("uniqueSlug counts up past taken ones, and falls back when nothing's left", () => {
    assert.equal(uniqueSlug("Luna", []), "luna");
    assert.equal(uniqueSlug("Luna", ["luna", "luna-2"]), "luna-3");
    assert.equal(uniqueSlug("✨", [], "character"), "character");
    assert.ok(uniqueSlug("x".repeat(40), ["x".repeat(40)]).length <= 40);
  });
});

describe("tags and traits", () => {
  test("trimmed, once each ignoring case, within the limits", () => {
    assert.deepEqual(cleanList(["  Sleepy ", "sleepy", "", "Very   curious", "c", "d"], 3, 10), ["Sleepy", "Very curio", "c"]);
  });
});

describe("assembleGallery", () => {
  const pieces = [piece("old", "2026-01-01", ["#aa0000", "#00aa00"]), piece("new", "2026-09-01"), piece("mid", "2026-05-01")];

  test("pieces newest first; a character's cover comes first, then newest", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ coverId: "old", art: [{ artworkId: "new", section: "art" }, { artworkId: "old", section: "design" }, { artworkId: "mid", section: "art" }] })],
      collections: [],
      adoptables: [],
    });
    assert.deepEqual(g.pieces.map((p) => p.id), ["new", "mid", "old"]);
    assert.deepEqual(g.characters[0].art.map((a) => a.piece.id), ["old", "new", "mid"]);
    assert.equal(g.characters[0].cover?.src, "/old.png");
  });

  test("without a cover, the first design piece is the cover; colors come from it", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ art: [{ artworkId: "new", section: "art" }, { artworkId: "old", section: "design" }] })],
      collections: [],
      adoptables: [],
    });
    assert.equal(g.characters[0].coverId, "old");
    assert.deepEqual(g.characters[0].palette, ["#aa0000", "#00aa00"]);
    assert.deepEqual(g.characters[0].ownPalette, []);
  });

  test("the artist's own colors win over the cover's", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ palette: ["#ffffff"], art: [{ artworkId: "old", section: "design" }] })],
      collections: [],
      adoptables: [],
    });
    assert.deepEqual(g.characters[0].palette, ["#ffffff"]);
  });

  test("pieces that are gone drop off; sections keep page order and skip empty ones", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ art: [{ artworkId: "gone", section: "design" }, { artworkId: "mid", section: "expressions" }, { artworkId: "new", section: "outfits" }] })],
      collections: [{ id: "col_1", ownerHandle: "luna.art", slug: "s", title: "S", description: "", artworkIds: ["gone", "mid"], createdAt: "2026-01-01" }],
      adoptables: [],
    });
    assert.deepEqual(sectionsOf(g.characters[0]).map((s) => s.id), ["outfits", "expressions"]);
    assert.deepEqual(g.collections[0].pieces.map((p) => p.id), ["mid"]);
    assert.equal(g.collections[0].coverId, "mid");
  });

  test("a linked adoptable becomes a link to its buy sheet", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ adoptableId: "adopt_1" })],
      collections: [],
      adoptables: [
        { id: "adopt_1", ownerHandle: "luna.art", name: "Luna", species: "", description: "", images: [], priceUsd: 45, includes: [], status: "available", createdAt: "" },
      ],
    });
    assert.deepEqual(g.characters[0].adoptable, { id: "adopt_1", priceUsd: 45, status: "available", href: "/luna.art/adoptables#adopt_1" });
  });

  test("the index says where every piece is shown", () => {
    const g = assembleGallery({
      pieces,
      characters: [character({ art: [{ artworkId: "new", section: "outfits" }] })],
      collections: [{ id: "col_1", ownerHandle: "luna.art", slug: "s", title: "S", description: "", artworkIds: ["new"], createdAt: "2026-01-01" }],
      adoptables: [],
    });
    const index = galleryIndex(g, { handle: "luna.art", ownerId: "u1", adoptables: [] });
    assert.deepEqual(index.places.new, { characters: [{ id: "chr_1", section: "outfits" }], collections: ["col_1"] });
    assert.equal(index.places.old, undefined);
  });
});
