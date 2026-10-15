/**
 * Closing a commission service only once its commissions are done. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { closeBlocked, openOrdersSummary } from "./closing.ts";

describe("closing or deleting a commission service", () => {
  test("nothing open (or only finished and ended orders): it can close", () => {
    assert.equal(closeBlocked("Headshot", [], "close"), null);
    assert.equal(closeBlocked("Headshot", ["delivered", "declined", "cancelled", "expired"], "delete"), null);
  });

  test("any open order keeps it open, waitlisted requests included", () => {
    assert.equal(
      closeBlocked("Headshot", ["waitlisted"], "close"),
      "“Headshot” stays open until its commissions are done: 1 request to answer. Answer or decline them, then close it.",
    );
    assert.equal(
      closeBlocked("Half-body", ["pending", "quoted", "paid", "in_progress", "delivered"], "delete"),
      "You can't delete “Half-body” yet: 1 request to answer, 1 quote waiting on the buyer and 2 commissions to draw. Deliver or decline them first.",
    );
    assert.equal(
      closeBlocked("Chibi", ["in_progress"], "close"),
      "“Chibi” stays open until its commissions are done: 1 commission to draw. Deliver them, then close it.",
    );
  });

  test("the summary counts each kind of open order", () => {
    assert.equal(openOrdersSummary(["pending", "pending", "waitlisted"]), "3 requests to answer");
    assert.equal(openOrdersSummary(["quoted", "quoted"]), "2 quotes waiting on buyers");
    assert.equal(openOrdersSummary(["in_progress", "paid"]), "2 commissions to draw");
    assert.equal(openOrdersSummary(["pending", "in_progress"]), "1 request to answer and 1 commission to draw");
  });
});
