import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Artist codes, end to end: anyone can join, but selling takes an artist
 * code. A founding artist gets codes from the team and a gift on their next
 * visit (once); a collector uses one from their own profile and becomes an
 * artist with 2 codes to pass on; the holder sees who used it; a code works
 * once; joining with a code makes you an artist on the spot; a collector
 * can't list anything, not even straight through the API.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function newAccount(tag: string) {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return { handle: `e2e_${tag}${id}`, email: `e2e+${tag}${id}@artiflow.test`, password: `Teal-brush-${id}!`, id: "" };
}

const holder = newAccount("h");
const collector = newAccount("c");
const latecomer = newAccount("l");
const joiner = newAccount("j");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const account of [holder, collector, latecomer]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.handle },
    });
    if (error) throw error;
    account.id = data.user.id;
  }
});

test.afterAll(async () => {
  for (const account of [holder, collector, latecomer, joiner]) if (account.id) await admin().auth.admin.deleteUser(account.id);
});

async function signIn(browser: Browser, account: { handle: string; password: string }): Promise<Page> {
  const page = await browser.newPage();
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

async function codesOf(account: { id: string }) {
  const { data } = await admin().from("invites").select("code, redeemed_by").eq("inviter_id", account.id).order("code");
  return data ?? [];
}

let codes: string[] = [];

test("a collector can browse but not sell", async ({ browser }) => {
  // Visitors see them as a collector, with no Commission button.
  const visitor = await browser.newPage();
  await visitor.goto(`/${collector.handle}`);
  await expect(visitor.locator('[data-part="collector-mark"]')).toHaveText("Collector");
  await expect(visitor.locator('[data-part="artist-mark"]')).toHaveCount(0);
  await expect(visitor.getByRole("link", { name: "Commission", exact: true })).toHaveCount(0);
  await visitor.close();

  // Their studio is the code sheet.
  const page = await signIn(browser, collector);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Selling here starts with an artist code." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock my studio" })).toBeVisible();

  // And the database refuses a listing made straight through the API.
  const { apiUrl, publishableKey } = localSupabase();
  const asCollector = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await asCollector.auth.signInWithPassword({ email: collector.email, password: collector.password });
  const listing = await asCollector.from("adoptables").insert({ name: "Sneaky", species: "", description: "", images: [], price_usd: 10, includes: [] });
  expect(listing.error).not.toBeNull();
  await page.close();
});

test("a founding artist gets codes, and a gift once", async ({ browser }) => {
  const { data, error } = await admin().rpc("grant_invites", { handle: holder.handle, how_many: 3, why: "e2e" });
  expect(error).toBeNull();
  codes = data as string[];
  expect(codes).toHaveLength(3);

  const page = await signIn(browser, holder);
  const gift = page.getByRole("dialog", { name: "You've got 3 artist codes!" });
  await expect(gift).toBeVisible();
  await gift.getByRole("button", { name: "Later" }).click();
  await expect(gift).toBeHidden();

  // Seen: it doesn't come back on the next page.
  await expect.poll(async () => (await admin().from("profiles").select("codes_seen_at").eq("id", holder.id).single()).data?.codes_seen_at).toBeTruthy();
  await page.goto(`/${holder.handle}`);
  await expect(page.locator('[data-part="artist-mark"]')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog", { name: /artist codes!/ })).toHaveCount(0);

  // The codes page lists them, all to give.
  await page.goto("/codes");
  await expect(page.locator('[data-part="codes-count"]')).toContainText("3 codes · 3 to give · 0 used");
  await expect(page.locator('[data-part="artist-code"]')).toHaveCount(3);
  for (const code of codes) await expect(page.getByText(code, { exact: true })).toBeVisible();
  await page.close();
});

test("a collector uses a code from their profile and gets 2 to pass on", async ({ browser }) => {
  const page = await signIn(browser, collector);
  await page.goto(`/${collector.handle}`);
  const strip = page.locator('[data-part="artist-code-strip"]:visible');
  await expect(strip).toBeVisible();
  await strip.getByLabel("Artist code").fill(codes[0].toLowerCase().replace("-", ""));
  await strip.getByRole("button", { name: "Unlock" }).click();

  // The welcome: their Artist Pass, and their 2 codes to pass on.
  const welcome = page.getByRole("dialog", { name: `Welcome to the artists, ${collector.handle}!` });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText(`@${holder.handle} let you in`);
  await expect(welcome).toContainText("You got 2 codes of your own");
  await expect(welcome.locator('[data-part="artist-pass"]')).toContainText("Official artist");
  expect(await codesOf(collector)).toHaveLength(2);

  // They share the pass: a post on their profile, drawn by the app.
  await expect(welcome.getByLabel("Tell everyone")).toHaveValue(`I'm officially an Artiflow artist! ✦ Thank you @${holder.handle} for letting me in.`);
  await welcome.getByRole("button", { name: "Share my Artist Pass" }).click();
  await expect(welcome.getByText("Your pass is up on your profile.")).toBeVisible();
  const { data: posts } = await admin().from("posts").select("body, milestone").eq("author_id", collector.id);
  expect(posts).toEqual([expect.objectContaining({ milestone: expect.objectContaining({ kind: "artist_pass", invitedBy: holder.handle }) })]);
  await welcome.getByRole("button", { name: "Close" }).click();

  // The codes were in the welcome, so no second gift on the next page.
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog", { name: /artist codes!/ })).toHaveCount(0);
  await expect(page.locator('[data-part="artist-pass"]:visible').first()).toBeVisible();

  // Their guest book: you're an artist, and 2 codes arrived.
  const { data: theirNotes } = await admin().from("notifications").select("kind").eq("recipient_id", collector.id).in("kind", ["became_artist", "artist_codes"]);
  expect(theirNotes?.map((n) => n.kind).toSorted()).toEqual(["artist_codes", "became_artist"]);

  // Their profile wears the Artist mark, which says whose code let them in.
  const mark = page.locator('[data-part="artist-mark"]');
  await expect(mark).toBeVisible();
  await expect(page.locator('[data-part="artist-code-strip"]:visible')).toHaveCount(0);
  await mark.click();
  await expect(page.locator(":popover-open").getByRole("link", { name: `@${holder.handle}`, exact: true })).toBeVisible();
  await page.close();

  // The holder sees who used it, and got a note in their guest book.
  const holderPage = await signIn(browser, holder);
  await holderPage.goto("/codes");
  await expect(holderPage.locator('[data-part="codes-count"]')).toContainText("3 codes · 2 to give · 1 used");
  const used = holderPage.locator('[data-part="artist-code"][data-used]');
  await expect(used).toHaveCount(1);
  await expect(used).toContainText(`@${collector.handle}`);
  const { data: notes } = await admin().from("notifications").select("kind").eq("recipient_id", holder.id).eq("kind", "invite_joined");
  expect(notes?.length).toBe(1);
  await holderPage.close();
});

test("a code works once", async ({ browser }) => {
  const page = await signIn(browser, latecomer);
  await page.goto("/codes");
  await page.getByLabel("Your code").fill(codes[0]);
  await page.getByRole("button", { name: "Unlock my studio" }).click();
  await expect(page.getByText(/already been used/)).toBeVisible();

  // A fresh one works, and the sheet says what's next.
  await page.getByLabel("Your code").fill(codes[1]);
  await page.getByRole("button", { name: "Unlock my studio" }).click();
  await expect(page.getByRole("heading", { name: "You're an Artiflow artist." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open your studio" })).toBeVisible();
  await page.close();
});

test("joining with a code makes you an artist on the spot", async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: joiner.email,
    password: joiner.password,
    email_confirm: true,
    user_metadata: { handle: joiner.handle, display_name: joiner.handle, invite_code: codes[2] },
  });
  expect(error).toBeNull();
  joiner.id = data.user!.id;
  const { data: profile } = await admin().from("profiles").select("artist_since, invited_by").eq("id", joiner.id).single();
  expect(profile?.artist_since).toBeTruthy();
  expect(profile?.invited_by).toBe(holder.id);
  expect(await codesOf(joiner)).toHaveLength(2);
  expect((await codesOf(holder)).every((c) => c.redeemed_by)).toBe(true);
});
