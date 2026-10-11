/**
 * Commission licenses and add-ons. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extrasUsd, isOptional, optionUsd, pickOptions, serviceOptions, usageOf } from "./addons.ts";

const service = {
  usage: {
    personal: { kind: "included" as const },
    commercialContent: { kind: "included" as const },
    commercialMerch: { kind: "percent" as const, percent: 200 },
  },
  addons: [
    { id: "lighting", label: "Mood lighting", price: { kind: "included" as const } },
    { id: "shading", label: "Full shading", price: { kind: "fixed" as const, usd: 10 } },
    { id: "animation", label: "Animated blink", price: { kind: "fixed" as const, usd: 10 } },
  ],
};

describe("licenses and add-ons", () => {
  const options = serviceOptions(service);

  test("licenses come first, then add-ons, in the artist's order", () => {
    assert.deepEqual(options.map((o) => o.id), [
      "license:personal", "license:commercialContent", "license:commercialMerch", "lighting", "shading", "animation",
    ]);
  });

  test("included ones can't be ticked (they're already in the price)", () => {
    assert.deepEqual(options.filter(isOptional).map((o) => o.id), ["license:commercialMerch", "shading", "animation"]);
    assert.deepEqual(pickOptions(options, ["lighting", "license:personal", "made-up"]), []);
  });

  test("fixed and percent prices add up on the 'from' price", () => {
    const picked = pickOptions(options, ["animation", "license:commercialMerch", "shading"]);
    assert.deepEqual(picked.map((o) => o.id), ["license:commercialMerch", "shading", "animation"]);
    assert.equal(extrasUsd(picked, 45), 90 + 10 + 10);
    assert.equal(optionUsd({ kind: "percent", percent: 50 }, 45), 22.5);
  });

  test("a license that isn't offered can't be bought", () => {
    const noMerch = serviceOptions({ ...service, usage: { ...service.usage, commercialMerch: null } });
    assert.deepEqual(pickOptions(noMerch, ["license:commercialMerch"]), []);
  });

  test("usage is commercial when the buyer holds a commercial license, included or ticked", () => {
    assert.equal(usageOf(service.usage, []), "commercial");
    const personalOnly = { ...service.usage, commercialContent: { kind: "percent" as const, percent: 50 } };
    assert.equal(usageOf(personalOnly, []), "personal");
    assert.equal(usageOf(personalOnly, ["license:commercialContent"]), "commercial");
  });
});
