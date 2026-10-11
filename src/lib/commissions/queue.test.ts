/**
 * Commission queue rules. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  applyPatches,
  countTabs,
  dueState,
  inTab,
  matches,
  moveTo,
  nextAction,
  sortOrders,
  tally,
  daysAhead,
  laneOrder,
  type QueueOrder,
} from "./queue.ts";

const avatar = { src: "/a.png", alt: "", width: 1, height: 1 };

function order(overrides: Partial<QueueOrder> & Pick<QueueOrder, "id" | "lane">): QueueOrder {
  return {
    number: Number(overrides.id.replace(/\D/g, "")) || 1,
    client: { handle: "lune.oc", name: "Lune", avatar },
    character: { name: "Lune", palette: ["#687a90"] },
    service: "Half-body illustration",
    priceUsd: 85,
    payment: "paid",
    usage: "personal",
    brief: "",
    references: [],
    requestedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

const TODAY = "2026-10-11";

const queue = [
  order({ id: "o1", lane: "request", payment: "unpaid" }),
  order({ id: "o2", lane: "request", payment: "unpaid", waitlist: true }),
  order({ id: "o3", lane: "proposal", payment: "invoiced", proposalExpiresAt: "2026-10-12T09:00:00.000Z" }),
  order({ id: "o4", lane: "queued", dueAt: "2026-10-27T15:00:00.000Z" }),
  order({ id: "o5", lane: "wip", step: "flats", dueAt: "2026-10-13T15:00:00.000Z" }),
  order({ id: "o6", lane: "wip", step: "lineart", paused: true, dueAt: "2026-10-31T15:00:00.000Z" }),
  order({ id: "o7", lane: "delivered", deliveredAt: "2026-10-08T19:00:00.000Z", priceUsd: 45 }),
  order({ id: "o8", lane: "delivered", deliveredAt: "2026-09-01T19:00:00.000Z", archived: true }),
];

describe("tabs", () => {
  test("'Needs you' holds open requests and paid work, never waitlisted, paused or archived orders", () => {
    assert.deepEqual(
      queue.filter((o) => inTab(o, "attention")).map((o) => o.id),
      ["o1", "o4", "o5"],
    );
  });

  test("every live order is in All, archived ones only in Archived", () => {
    const counts = countTabs(queue);
    assert.equal(counts.all, 7);
    assert.equal(counts.archived, 1);
    assert.equal(counts.waitlist, 1);
    assert.equal(counts.client, 1);
    assert.equal(counts.paused, 1);
    assert.equal(counts.delivered, 1);
  });
});

describe("moving a ticket", () => {
  const now = new Date("2026-10-11T10:00:00.000Z");

  test("onto the easel starts at the sketch and leaves the waitlist", () => {
    const patch = moveTo(order({ id: "o9", lane: "request", waitlist: true }), "wip", now);
    assert.equal(patch.lane, "wip");
    assert.equal(patch.step, "sketch");
    assert.equal(patch.waitlist, false);
  });

  test("delivering stamps the date; taking it back clears it", () => {
    const delivered = applyPatches([queue[4]], { o5: moveTo(queue[4], "delivered", now) })[0];
    assert.equal(delivered.deliveredAt, now.toISOString());
    const back = applyPatches([delivered], { o5: moveTo(delivered, "wip", now) })[0];
    assert.equal("deliveredAt" in back, false);
    assert.equal(back.step, "render");
  });

  test("only invoices or withdraws, and never touches a paid order's payment", () => {
    assert.equal(moveTo(queue[0], "proposal", now).payment, "invoiced");
    assert.equal(moveTo(queue[2], "request", now).payment, "unpaid");
    assert.equal("payment" in moveTo(queue[3], "wip", now), false);
    assert.equal("payment" in moveTo(queue[4], "request", now), false);
  });

  test("the next action walks the steps, then delivers", () => {
    assert.deepEqual(nextAction(order({ id: "a", lane: "wip", step: "lineart" })), {
      kind: "step",
      label: "On to flats",
      step: "flats",
    });
    assert.equal(nextAction(order({ id: "b", lane: "wip", step: "render" }))?.kind, "deliver");
    assert.equal(nextAction(queue[5])?.kind, "resume");
    assert.equal(nextAction(queue[7]), null);
  });
});

describe("dates", () => {
  test("deadlines read late, soon or fine", () => {
    assert.deepEqual(dueState(order({ id: "a", lane: "wip", dueAt: "2026-10-10T15:00:00.000Z" }), TODAY), {
      tone: "late",
      label: "1 day late",
      days: -1,
    });
    assert.equal(dueState(queue[4], TODAY).label, "Due in 2 days");
    assert.equal(dueState(queue[4], TODAY).tone, "soon");
    assert.equal(dueState(queue[3], TODAY).tone, "ok");
    assert.equal(dueState(queue[2], TODAY).label, "Expires tomorrow");
    assert.equal(dueState(queue[6], TODAY).label, "Delivered 3 days ago");
  });

  test("the planner looks a week ahead from today, across month ends", () => {
    assert.deepEqual(daysAhead("2026-10-29", 4), ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    assert.equal(daysAhead(TODAY).length, 7);
  });
});

describe("sorting, search and totals", () => {
  test("due dates sort soonest first with undated orders last", () => {
    const ids = sortOrders(queue.slice(0, 6), "due").map((o) => o.id);
    assert.deepEqual(ids.slice(0, 4), ["o3", "o5", "o4", "o6"]);
    assert.equal(sortOrders(queue, "due").at(-1)?.lane, "delivered");
    assert.equal(sortOrders(queue, "due", "desc").at(-1)?.lane, "delivered");
  });

  test("columns put new requests on top and paused work at the bottom", () => {
    const requests = [order({ id: "r1", lane: "request" }), order({ id: "r2", lane: "request", requestedAt: "2026-10-10T08:00:00.000Z" })];
    assert.deepEqual(laneOrder(requests, "request").map((o) => o.id), ["r2", "r1"]);
    assert.deepEqual(laneOrder(queue, "wip").map((o) => o.id), ["o5", "o6"]);
    const easel = [queue[5], order({ id: "o10", lane: "wip", dueAt: "2026-11-30T15:00:00.000Z" })];
    assert.deepEqual(laneOrder(easel, "wip").map((o) => o.id), ["o10", "o6"]);
  });

  test("search finds clients, characters and ticket numbers", () => {
    assert.ok(matches(queue[0], "@lune"));
    assert.ok(matches(order({ id: "o42", lane: "wip", number: 42 }), "No. 0042"));
    assert.ok(!matches(queue[0], "bramble"));
  });

  test("tally counts paid work in progress and this month's earnings after the fee", () => {
    const t = tally(queue, TODAY, 10);
    assert.equal(t.needsYou, 3);
    assert.equal(t.onEasel, 1);
    assert.equal(t.inProgressUsd, 85 * 3);
    assert.equal(t.deliveredThisMonth, 1);
    assert.equal(t.earnedThisMonthUsd, 40.5);
  });
});
