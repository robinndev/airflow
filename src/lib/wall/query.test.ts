/**
 * Explore wall rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseWall,
  runWall,
  spreadArtists,
  wallCounts,
  wallFilters,
  wallHref,
  type WallEntry,
  type WallItem,
} from "./query.ts";

const NOW = Date.UTC(2026, 9, 14);
const image = { src: "/a.webp", alt: "", width: 100, height: 100 };

function entry(id: string, over: Partial<WallItem> = {}, words: Partial<Pick<WallEntry, "tags" | "text">> = {}): WallEntry {
  return {
    item: {
      id,
      kind: "piece",
      title: id,
      images: [image],
      artist: { handle: "mira", name: "Mira", avatar: image, href: "/mira" },
      href: "/mira/gallery",
      moods: [],
      likes: 0,
      createdAt: "2026-10-10T12:00:00Z",
      ...over,
    },
    tags: words.tags ?? "",
    text: words.text ?? "",
  };
}

const artist = (handle: string) => ({ handle, name: handle, avatar: image, href: `/${handle}` });

describe("parseWall / wallHref", () => {
  test("defaults stay out of the URL", () => {
    const p = parseWall({});
    assert.deepEqual(p, { q: "", show: "all", open: false, sort: "mix", seed: 1 });
    assert.equal(wallHref(p), "/explore");
  });

  test("unknown values are dropped", () => {
    const p = parseWall({ show: "nope", color: "neon", sort: "loud", open: "yes", seed: "-4" });
    assert.equal(p.show, "all");
    assert.equal(p.color, undefined);
    assert.equal(p.sort, "mix");
    assert.equal(p.open, false);
    assert.equal(p.seed, 1);
  });

  test("round trip, and the seed only rides with shuffle", () => {
    const p = parseWall({ q: " fox ", show: "characters", color: "tidepool", open: "1", sort: "shuffle", seed: "42" });
    assert.equal(wallHref(p), "/explore?q=fox&show=characters&color=tidepool&open=1&sort=shuffle&seed=42");
    assert.equal(wallHref(p, { sort: "new" }), "/explore?q=fox&show=characters&color=tidepool&open=1&sort=new");
    assert.deepEqual(parseWall(Object.fromEntries(new URLSearchParams(wallHref(p).split("?")[1]))), p);
  });
});

describe("runWall", () => {
  const entries = [
    entry("piece:a", { title: "Ember the fox", moods: ["golden-hour"], likes: 900, openFromUsd: 55 }),
    entry("post:b", { kind: "post", title: "Night shift", moods: ["midnight"], likes: 10, createdAt: "2026-10-13T12:00:00Z" }),
    entry("character:c", { kind: "character", title: "Kinako", subtitle: "Fox spirit", likes: 0 }),
    entry("adoptable:d", { kind: "adoptable", title: "Pip", priceUsd: 45, status: "available" }, { tags: "bunny mechanic" }),
    entry("commission:e", { kind: "commission", title: "Half-body", openFromUsd: 90, createdAt: "2026-09-01T12:00:00Z" }),
  ];
  const ids = (list: WallEntry[]) => list.map((e) => e.item.id);

  test("tabs: art is pieces, posts and commission examples", () => {
    assert.deepEqual(ids(runWall(entries, parseWall({ show: "art", sort: "new" }), NOW)), ["post:b", "piece:a", "commission:e"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ show: "characters" }), NOW)), ["character:c"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ show: "adoptables" }), NOW)), ["adoptable:d"]);
  });

  test("palette and open-for-commissions filters", () => {
    assert.deepEqual(ids(runWall(entries, parseWall({ color: "midnight" }), NOW)), ["post:b"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ open: "1", sort: "new" }), NOW)), ["piece:a", "commission:e"]);
  });

  test("search matches titles, species, tags and kinds, best match first", () => {
    assert.deepEqual(ids(runWall(entries, parseWall({ q: "fox" }), NOW)), ["piece:a", "character:c"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ q: "bunny" }), NOW)), ["adoptable:d"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ q: "adoptable" }), NOW)), ["adoptable:d"]);
    assert.deepEqual(ids(runWall(entries, parseWall({ q: "fox spirit" }), NOW)), ["character:c"]);
  });

  test("trending: likes weighed down by age", () => {
    assert.equal(runWall(entries, parseWall({ sort: "trending" }), NOW)[0].item.id, "piece:a");
  });

  test("shuffle is stable per seed and changes with it", () => {
    const a = ids(runWall(entries, parseWall({ sort: "shuffle", seed: "3" }), NOW));
    assert.deepEqual(ids(runWall(entries, parseWall({ sort: "shuffle", seed: "3" }), NOW)), a);
    assert.deepEqual([...a].sort(), ids(entries).sort());
    const others = [4, 5, 6, 7].map((seed) => ids(runWall(entries, parseWall({ sort: "shuffle", seed: String(seed) }), NOW)).join());
    assert.ok(others.some((o) => o !== a.join()));
  });

  test("mix keeps every tile, once", () => {
    const mixed = ids(runWall(entries, parseWall({}), NOW));
    assert.deepEqual([...mixed].sort(), ids(entries).sort());
  });
});

describe("spreadArtists", () => {
  test("one artist doesn't fill a row when others are waiting", () => {
    const list = [
      entry("1", { artist: artist("a") }),
      entry("2", { artist: artist("a") }),
      entry("3", { artist: artist("a") }),
      entry("4", { artist: artist("b") }),
      entry("5", { artist: artist("c") }),
    ];
    assert.deepEqual(
      spreadArtists(list, 2).map((e) => e.item.artist.handle),
      ["a", "b", "c", "a", "a"],
    );
  });
});

describe("wallCounts / wallFilters", () => {
  test("tab counts follow the other filters", () => {
    const entries = [
      entry("piece:a", { moods: ["fern"] }),
      entry("character:b", { kind: "character", moods: ["fern"] }),
      entry("adoptable:c", { kind: "adoptable" }),
    ];
    assert.deepEqual(wallCounts(entries, parseWall({ color: "fern", show: "adoptables" })), {
      all: 2,
      art: 1,
      characters: 1,
      adoptables: 0,
    });
  });

  test("names what narrowed the wall", () => {
    assert.deepEqual(wallFilters(parseWall({})), []);
    assert.deepEqual(wallFilters(parseWall({ q: "fox", show: "art", color: "fern", open: "1", sort: "new" })), ["q", "show", "color", "open"]);
  });
});
