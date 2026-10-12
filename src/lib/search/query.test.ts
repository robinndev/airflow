/**
 * Search rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  activeFilters,
  adoptMatches,
  parseSearch,
  relevance,
  runSearch,
  searchHref,
  serviceMatches,
  terms,
  trendScore,
  type AdoptHit,
  type ServiceHit,
} from "./query.ts";

const KNOWN = {
  categories: ["illustration", "icons", "chibi"],
  styles: ["anime", "painterly", "cel_shaded"],
  draws: ["human", "anthro", "feral"],
};
const LABELS = { category: (id: string) => id, style: (id: string) => id, draw: (id: string) => id };
const image = { src: "/a.png", alt: "", width: 10, height: 10 };
const artist = (handle: string, name = handle) => ({ handle, name, avatar: image, href: `/${handle}` });

function service(over: Partial<ServiceHit> = {}): ServiceHit {
  return {
    kind: "service",
    id: "s1",
    title: "Fursona headshot",
    description: "Shoulders-up portrait",
    category: "icons",
    styles: ["cel_shaded"],
    draws: ["anthro", "feral"],
    artist: artist("mira", "Mira"),
    priceFromUsd: 20,
    priceToUsd: 50,
    turnaround: "1–2 weeks",
    turnaroundDays: { min: 7, max: 14 },
    status: "open",
    slots: { total: 5, taken: 1 },
    examples: [image],
    createdAt: "2026-10-01T00:00:00Z",
    popularity: 10,
    href: "/mira/commissions#s1",
    ...over,
  };
}

describe("parseSearch", () => {
  test("reads filters and drops unknown values", () => {
    const p = parseSearch(
      { q: "  fox  ", type: "adoptables", style: "anime,nope", draws: ["feral", "dragon"], min: "80", max: "20", sort: "popular", category: "comics" },
      KNOWN,
    );
    assert.equal(p.q, "fox");
    assert.equal(p.type, "adoptables");
    assert.deepEqual(p.styles, ["anime"]);
    assert.deepEqual(p.draws, ["feral"]);
    assert.equal(p.category, undefined);
    // Swapped so the range makes sense.
    assert.equal(p.minUsd, 20);
    assert.equal(p.maxUsd, 80);
    assert.equal(p.sort, "popular");
  });

  test("defaults: commissions open now; artists show everyone", () => {
    assert.equal(parseSearch({}, KNOWN).availability, "open");
    assert.equal(parseSearch({ type: "artists" }, KNOWN).availability, "all");
  });

  test("round-trips through the URL, leaving defaults out", () => {
    const p = parseSearch({ q: "fox", style: "anime", max: "60" }, KNOWN);
    assert.equal(searchHref(p), "/explore/search?q=fox&style=anime&max=60");
    assert.equal(searchHref(p, { sort: "recent", page: 2 }), "/explore/search?q=fox&style=anime&max=60&sort=recent&page=2");
    assert.equal(searchHref(parseSearch({}, KNOWN)), "/explore/search");
  });
});

describe("relevance", () => {
  test("every term has to match, and names outweigh descriptions", () => {
    assert.deepEqual(terms("@Bramble #Fox  héadshot"), ["bramble", "fox", "headshot"]);
    const fields = [
      { weight: 4, text: "Fursona headshot" },
      { weight: 1, text: "Shoulders-up portrait" },
    ];
    assert.equal(relevance(fields, ["dragon"]), 0);
    assert.equal(relevance(fields, ["headshot", "dragon"]), 0);
    assert.ok(relevance(fields, ["headshot"]) > relevance(fields, ["portrait"]));
    // A word start counts; a stray letter in the middle doesn't.
    assert.ok(relevance(fields, ["furs"]) > 0);
    assert.equal(relevance(fields, ["d"]), 0);
  });
});

describe("filters", () => {
  const p = (raw: Record<string, string>) => parseSearch(raw, KNOWN);

  test("open now excludes full, waitlisted and closed services", () => {
    assert.ok(serviceMatches(service(), p({})));
    assert.equal(serviceMatches(service({ slots: { total: 3, taken: 3 } }), p({})), false);
    assert.equal(serviceMatches(service({ status: "waitlist" }), p({})), false);
    assert.ok(serviceMatches(service({ status: "waitlist" }), p({ avail: "waitlist" })));
    assert.equal(serviceMatches(service({ status: "closed" }), p({ avail: "waitlist" })), false);
    assert.ok(serviceMatches(service({ status: "closed" }), p({ avail: "all" })));
  });

  test("price ranges overlap, turnaround is the longest promise", () => {
    assert.ok(serviceMatches(service(), p({ min: "40", max: "100" })));
    assert.equal(serviceMatches(service(), p({ min: "60" })), false);
    assert.equal(serviceMatches(service(), p({ max: "10" })), false);
    assert.ok(serviceMatches(service(), p({ turnaround: "2weeks" })));
    assert.equal(serviceMatches(service(), p({ turnaround: "week" })), false);
  });

  test("styles must all match; subjects any", () => {
    assert.ok(serviceMatches(service(), p({ style: "cel_shaded" })));
    assert.equal(serviceMatches(service(), p({ style: "cel_shaded,anime" })), false);
    assert.ok(serviceMatches(service(), p({ draws: "human,feral" })));
    assert.equal(serviceMatches(service(), p({ draws: "human" })), false);
  });

  test("adoptables: available only, unless asked for everything", () => {
    const adopt: AdoptHit = {
      kind: "adoptable", id: "a1", name: "Pip", species: "Bunny", description: "", draws: ["anthro"], artist: artist("kai"),
      priceUsd: 45, status: "sold", image, createdAt: "2026-10-01T00:00:00Z", popularity: 1, href: "/kai/adoptables#a1",
    };
    assert.equal(adoptMatches(adopt, parseSearch({ type: "adoptables" }, KNOWN)), false);
    assert.ok(adoptMatches(adopt, parseSearch({ type: "adoptables", avail: "all" }, KNOWN)));
  });

  test("lists what narrowed the results", () => {
    assert.deepEqual(activeFilters(p({ style: "anime", max: "50", avail: "all" })), ["styles", "minUsd", "availability"]);
  });
});

describe("runSearch", () => {
  const hits = [
    service({ id: "old-popular", title: "Chibi sticker", popularity: 90, createdAt: "2026-09-01T00:00:00Z" }),
    service({ id: "new", title: "Fox headshot", popularity: 5, createdAt: "2026-10-10T00:00:00Z" }),
    service({ id: "fox-artist", title: "Half-body", artist: artist("foxglove", "Foxglove"), popularity: 40, createdAt: "2026-10-05T00:00:00Z" }),
  ];
  const run = (raw: Record<string, string>) => runSearch(hits, parseSearch(raw, KNOWN), serviceMatches, LABELS).map((h) => h.id);

  test("relevance puts the listing's name above the artist's", () => {
    assert.deepEqual(run({ q: "fox" }), ["new", "fox-artist"]);
  });
  test("recent and popular", () => {
    assert.deepEqual(run({ sort: "recent" }), ["new", "fox-artist", "old-popular"]);
    assert.deepEqual(run({ sort: "popular" }), ["old-popular", "fox-artist", "new"]);
  });
  test("no query: open first, then popular", () => {
    const mixed = [service({ id: "wl", status: "waitlist", popularity: 99 }), service({ id: "open", popularity: 1 })];
    const ids = runSearch(mixed, parseSearch({ avail: "waitlist" }, KNOWN), serviceMatches, LABELS).map((h) => h.id);
    assert.deepEqual(ids, ["open", "wl"]);
  });
});

test("trending: fresh likes beat old ones", () => {
  assert.ok(trendScore(100, 1) > trendScore(300, 20));
});
