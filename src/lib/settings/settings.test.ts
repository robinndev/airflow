/**
 * Settings rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deviceOf, maskEmail } from "./account.ts";
import { ALWAYS_ON, MUTABLE_KINDS, NOTICE_GROUPS, cleanMuted } from "./notifications.ts";
import { clockIn, differenceLabel, isTimeZone, offsetMinutes, zoneLabel } from "./time.ts";

describe("the email on the inside cover", () => {
  test("keeps the first and last letter and the whole domain", () => {
    assert.equal(maskEmail("robin@gmail.com"), "r•••n@gmail.com");
    assert.equal(maskEmail("nightowl.draws@privaterelay.appleid.com"), "n••••••••s@privaterelay.appleid.com");
  });

  test("short names show only their first letter", () => {
    assert.equal(maskEmail("al@x.io"), "a•••@x.io");
    assert.equal(maskEmail("bea@x.io"), "b•••@x.io");
  });

  test("anything that isn't an address is left alone", () => {
    assert.equal(maskEmail("nobody"), "nobody");
  });
});

describe("where you're signed in", () => {
  test("names the browser and the system", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
    assert.deepEqual(deviceOf(mac), { device: "Chrome on macOS", kind: "computer" });
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
    assert.deepEqual(deviceOf(iphone), { device: "Safari on iPhone", kind: "phone" });
    const edge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0";
    assert.equal(deviceOf(edge).device, "Edge on Windows");
    const android = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
    assert.deepEqual(deviceOf(android), { device: "Chrome on Android", kind: "phone" });
  });

  test("tools and unknowns still read as something", () => {
    assert.equal(deviceOf(null).device, "An unknown browser");
    assert.equal(deviceOf("node").device, "An unknown browser");
  });
});

describe("muting the guest book", () => {
  test("keeps known kinds once, in a stable order", () => {
    assert.deepEqual(cleanMuted(["follow", "like", "follow", "commission_request", 3, null]), ["like", "follow"]);
  });

  test("every mutable kind has a switch, and none of them is always on", () => {
    const listed = NOTICE_GROUPS.flatMap((group) => group.items.map((item) => item.kind));
    assert.deepEqual([...listed].sort(), [...MUTABLE_KINDS].sort());
    const always = ALWAYS_ON.flatMap((entry) => entry.kinds as string[]);
    assert.ok(MUTABLE_KINDS.every((kind) => !always.includes(kind)));
  });
});

describe("local time", () => {
  // 2026-01-15 18:30 UTC: no daylight saving in São Paulo or Kolkata, standard time in New York.
  const winter = new Date(Date.UTC(2026, 0, 15, 18, 30));

  test("accepts zone names the browser knows, nothing else", () => {
    assert.ok(isTimeZone("America/Sao_Paulo"));
    assert.ok(isTimeZone("America/Argentina/Buenos_Aires"));
    assert.ok(isTimeZone("UTC"));
    assert.ok(!isTimeZone("Mars/Olympus_Mons"));
    assert.ok(!isTimeZone("../etc/passwd"));
    assert.ok(!isTimeZone(42));
  });

  test("tells the clock and the offset there", () => {
    assert.equal(clockIn("America/Sao_Paulo", winter), "3:30 pm");
    assert.equal(offsetMinutes("America/Sao_Paulo", winter), -180);
    assert.equal(offsetMinutes("Asia/Kolkata", winter), 330);
  });

  test("says how far it is from the visitor's own clock", () => {
    assert.equal(differenceLabel("America/Sao_Paulo", "America/New_York", winter), "2h ahead of you");
    assert.equal(differenceLabel("America/New_York", "Asia/Kolkata", winter), "10h 30m behind you");
    assert.equal(differenceLabel("Asia/Kolkata", "Asia/Calcutta", winter), "same time as you");
    assert.equal(differenceLabel("Asia/Kathmandu", "Asia/Kolkata", winter), "15m ahead of you");
  });

  test("reads zone names as places", () => {
    assert.equal(zoneLabel("America/Sao_Paulo"), "Sao Paulo (America)");
    assert.equal(zoneLabel("America/Argentina/Buenos_Aires"), "Buenos Aires (America / Argentina)");
    assert.equal(zoneLabel("UTC"), "UTC");
  });
});
