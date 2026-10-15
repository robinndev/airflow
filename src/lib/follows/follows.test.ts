/**
 * Followers / following lists: what each viewer is told. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cleanFollowQuery, emptyNote, followLabel, listBlurb, marksFollowsYou, mutualFilterLabel } from "./list.ts";

describe("the follow button on a card", () => {
  test("offers to follow back someone who follows you", () => {
    assert.equal(followLabel({ following: false, followsYou: true }), "Follow back");
  });

  test("says Following once you do, whether or not they follow you", () => {
    assert.equal(followLabel({ following: true, followsYou: true }), "Following");
    assert.equal(followLabel({ following: true, followsYou: false }), "Following");
  });

  test("is a plain Follow for strangers", () => {
    assert.equal(followLabel({ following: false, followsYou: false }), "Follow");
  });
});

describe("people who also follow you", () => {
  test("on someone else's lists, both of them", () => {
    assert.equal(mutualFilterLabel("followers", false), "Also follow you");
    assert.equal(mutualFilterLabel("following", false), "Also follow you");
  });

  test("on your own following: who follows you back", () => {
    assert.equal(mutualFilterLabel("following", true), "Follow you back");
  });

  test("not on your own followers, where everyone does", () => {
    assert.equal(mutualFilterLabel("followers", true), null);
    assert.equal(marksFollowsYou("followers", true), false);
    assert.equal(marksFollowsYou("following", true), true);
    assert.equal(marksFollowsYou("followers", false), true);
  });
});

describe("the words around a list", () => {
  test("speak to the owner, or about them", () => {
    assert.equal(listBlurb("followers", { own: true, name: "Mira" }), "People who follow you.");
    assert.equal(listBlurb("following", { own: false, name: "Mira" }), "People Mira follows.");
    assert.equal(emptyNote("followers", { own: false, name: "Mira" }).body, "Be the first to follow Mira.");
    assert.equal(emptyNote("following", { own: true, name: "Mira" }).title, "Not following anyone yet");
  });
});

describe("searching a list", () => {
  test("trims, keeps single spaces and drops a leading @", () => {
    assert.equal(cleanFollowQuery("  @mira_sol  "), "mira_sol");
    assert.equal(cleanFollowQuery("Mira   Sol"), "Mira Sol");
  });

  test("caps the length and ignores anything that isn't text", () => {
    assert.equal(cleanFollowQuery("x".repeat(90)).length, 40);
    assert.equal(cleanFollowQuery(null), "");
    assert.equal(cleanFollowQuery({ q: "mira" }), "");
  });
});
