import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Artist codes, end to end: anyone can join, but selling takes an artist
 * code. A founding artist gets codes from the team and a gift on their next
 * visit (once); a collector uses one from their own profile and becomes an
 * artist (no codes of their own yet); the holder sees who used it; a code
 * works once; joining with a code makes you an artist on the spot; reaching
 * 10 followers and $100 in sales makes you verified, with 2 codes; a
 * collector can't list anything, not even straight through the API.
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

  // The welcome: their Artist Pass, and the way to verification (codes come with it, not with the code).
  const welcome = page.getByRole("dialog", { name: `Welcome to the artists, ${collector.handle}!` });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText(`@${holder.handle} let you in`);
  await expect(welcome).toContainText("Next: 10 followers and $100 in sales make you a verified artist");
  await expect(welcome.locator('[data-part="artist-pass"]')).toContainText("Official artist");
  expect(await codesOf(collector)).toHaveLength(0);

  // They share the pass: a post on their profile, drawn by the app.
  await expect(welcome.getByLabel("Tell everyone")).toHaveValue(`I'm officially an Artiflow artist! ✦ Thank you @${holder.handle} for letting me in.`);
  await welcome.getByRole("button", { name: "Share my Artist Pass" }).click();
  await expect(welcome.getByText("Your pass is up on your profile.")).toBeVisible();
  const { data: posts } = await admin().from("posts").select("body, milestone").eq("author_id", collector.id);
  expect(posts).toEqual([expect.objectContaining({ milestone: expect.objectContaining({ kind: "artist_pass", invitedBy: holder.handle }) })]);
  await welcome.getByRole("button", { name: "Close" }).click();

  // No codes yet, so no gift on the next page.
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog", { name: /artist codes!/ })).toHaveCount(0);
  await expect(page.locator('[data-part="artist-pass"]:visible').first()).toBeVisible();

  // Their guest book: you're an artist (no codes arrived).
  const { data: theirNotes } = await admin().from("notifications").select("kind").eq("recipient_id", collector.id).in("kind", ["became_artist", "artist_codes"]);
  expect(theirNotes?.map((n) => n.kind)).toEqual(["became_artist"]);

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
  const welcome = page.getByRole("dialog", { name: /Welcome to the artists/ });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Close" }).click();
  // The codes page is theirs now: the pass, and the way to verification.
  await expect(page.getByRole("heading", { name: "Your Artist Pass" })).toBeVisible();
  await expect(page.locator('[data-part="verify-goals"]')).toContainText("0 of 10");
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
  expect(await codesOf(joiner)).toHaveLength(0);
  expect((await codesOf(holder)).every((c) => c.redeemed_by)).toBe(true);
});

test("reaching the goals makes an artist verified, with 2 codes", async ({ browser }) => {
  // Ten followers, then a $120 order paid: the database checks the goals as each happens.
  const fans = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const fan = newAccount(`f${i}`);
      const { data, error } = await admin().auth.admin.createUser({
        email: fan.email,
        password: fan.password,
        email_confirm: true,
        user_metadata: { handle: fan.handle, display_name: fan.handle },
      });
      if (error) throw error;
      return data.user.id;
    }),
  );
  try {
    for (const fan of fans) expect((await admin().from("follows").insert({ follower_id: fan, followee_id: collector.id })).error).toBeNull();
    const notYet = await admin().from("profiles").select("verified_at").eq("id", collector.id).single();
    expect(notYet.data?.verified_at).toBeNull();

    const { data: order, error } = await admin()
      .from("commission_requests")
      .insert({ buyer_id: fans[0], artist_id: collector.id, service_title: "Custom piece", description: "A fox in a winter scarf, half body, soft colors please." })
      .select("id")
      .single();
    expect(error).toBeNull();
    await admin()
      .from("commission_requests")
      .update({ status: "quoted", quote_usd: 120, quoted_at: new Date().toISOString(), quote_expires_at: new Date(Date.now() + 864e5).toISOString() })
      .eq("id", order!.id);
    await admin().from("commission_requests").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order!.id);

    const { data: verified } = await admin().from("profiles").select("verified_at").eq("id", collector.id).single();
    expect(verified?.verified_at).toBeTruthy();
    expect(await codesOf(collector)).toHaveLength(2);
    const { data: notes } = await admin().from("notifications").select("kind").eq("recipient_id", collector.id).eq("kind", "verified");
    expect(notes).toHaveLength(1);

    // The gift says so, and the profile wears the verified mark.
    const page = await signIn(browser, collector);
    const gift = page.getByRole("dialog", { name: "You're a verified artist!" });
    await expect(gift).toBeVisible();
    await gift.getByRole("button", { name: "Later" }).click();
    await page.goto(`/${collector.handle}`);
    await expect(page.locator('[data-part="artist-mark"][data-verified]:visible')).toContainText("Verified artist");
    await page.close();
  } finally {
    for (const fan of fans) await admin().auth.admin.deleteUser(fan);
  }
});
