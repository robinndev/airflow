/**
 * The buyer's requests. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { countShows, inShow, shipment, sortRequests, stampOf, stopOf, type MyRequest } from "./requests.ts";

const avatar = { src: "/a.png", alt: "", width: 1, height: 1 };

function request(overrides: Partial<MyRequest> & Pick<MyRequest, "id" | "status">): MyRequest {
  return {
    artist: { handle: "mira", name: "Mira Solenne", avatar },
    service: "Headshot & icon",
    brief: "",
    priceUsd: 45,
    sentAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

const TODAY = "2026-10-11";

const list = [
  request({ id: "sent", status: "sent", sentAt: "2026-10-10T12:00:00.000Z" }),
  request({ id: "wait", status: "waitlisted", sentAt: "2026-10-02T12:00:00.000Z" }),
  request({ id: "quote", status: "quoted", quotedAt: "2026-10-09T12:00:00.000Z", quoteExpiresAt: "2026-10-13T12:00:00.000Z", priceUsd: 65 }),
  request({ id: "queued", status: "paid", paidAt: "2026-10-08T12:00:00.000Z", dueAt: "2026-10-30T12:00:00.000Z", priceUsd: 85 }),
  request({ id: "lineart", status: "paid", step: "lineart", paidAt: "2026-09-20T12:00:00.000Z", dueAt: "2026-10-16T12:00:00.000Z", priceUsd: 115 }),
  request({ id: "done", status: "delivered", step: "render", paidAt: "2026-09-01T12:00:00.000Z", deliveredAt: "2026-10-06T12:00:00.000Z", priceUsd: 160 }),
  request({ id: "no", status: "declined", closedAt: "2026-10-03T12:00:00.000Z" }),
];

describe("the route", () => {
  test("each status sits at its stop", () => {
    assert.deepEqual(list.map(stopOf), ["sent", "sent", "quoted", "paid", "making", "delivered", "sent"]);
  });

  test("reached stops carry their date; the rest are blank", () => {
    assert.equal(stampOf(list[2], "quoted"), "2026-10-09T12:00:00.000Z");
    assert.equal(stampOf(list[2], "paid"), undefined);
    assert.equal(stampOf(list[4], "making"), "2026-09-20T12:00:00.000Z");
  });
});

describe("filters and order", () => {
  test("a quote is your move; sent and waitlisted wait on the artist", () => {
    const counts = countShows(list);
    assert.equal(counts.all, 7);
    assert.equal(counts.yours, 1);
    assert.equal(counts.waiting, 2);
    assert.equal(counts.making, 2);
    assert.equal(counts.closed, 1);
    assert.ok(inShow(list[0], "waiting"));
  });

  test("your move first, then work by due date, waiting, delivered, closed", () => {
    assert.deepEqual(sortRequests(list).map((r) => r.id), ["quote", "lineart", "queued", "sent", "wait", "done", "no"]);
  });
});

test("the shipping label shows the next arrival and this year's spend", () => {
  const label = shipment(list, TODAY);
  assert.equal(label.next?.id, "lineart");
  assert.equal(label.nextInDays, 5);
  assert.equal(label.quotes, 1);
  assert.equal(label.spentThisYearUsd, 85 + 115 + 160);
});
