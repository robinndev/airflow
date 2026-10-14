/**
 * Cancel reasons. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CANCEL_CHOICES, CANCEL_READS, CANCEL_REASONS, checkCancel } from "./cancel.ts";

describe("cancelling a commission request", () => {
  test("a reason is required", () => {
    assert.deepEqual(checkCancel(undefined, ""), { ok: false, error: "Pick a reason first." });
    assert.deepEqual(checkCancel("bored", ""), { ok: false, error: "Pick a reason first." });
  });

  test("the note is optional, trimmed, and empty becomes null", () => {
    assert.deepEqual(checkCancel("timing", "   "), { ok: true, reason: "timing", note: null });
    assert.deepEqual(checkCancel("price", "  Saving up, I'll be back! "), { ok: true, reason: "price", note: "Saving up, I'll be back!" });
  });

  test("'something else' needs a few words; long notes are refused", () => {
    assert.equal(checkCancel("other", "").ok, false);
    assert.equal(checkCancel("other", "My cat sat on the keyboard").ok, true);
    assert.equal(checkCancel("changed_mind", "x".repeat(501)).ok, false);
  });

  test("every reason has the buyer's wording and the artist's", () => {
    for (const reason of CANCEL_REASONS) {
      assert.ok(CANCEL_CHOICES[reason].request && CANCEL_CHOICES[reason].quote);
      assert.ok(CANCEL_READS[reason]);
    }
  });
});
