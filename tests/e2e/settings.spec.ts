import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";
import { latestEmailTo, verifyLink } from "./support/mailpit";

/*
 * Settings, end to end: visitors get the sign-in sheet (Appearance works
 * without an account); a muted kind never reaches the guest book and comes
 * back when unmuted; the password changes only with the current one; like
 * counts hide everywhere you look; local time shows on the profile; another
 * device can be signed out; and an email change takes both links.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Account = { handle: string; name: string; email: string; password: string; id: string };

const run = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const account = (who: string, name: string): Account => ({
  handle: `e2e_${who}_${run}`,
  name,
  email: `e2e+${who}${run}@artiflow.test`,
  password: `Teal-brush-${run}!`,
  id: "",
});
const artist = account("set", "Sola Tern");
const fan = account("sfan", "Fia Brook");
const other = account("sfan2", "Oto Reed");

async function as(person: Account) {
  const { apiUrl, publishableKey } = localSupabase();
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: person.email, password: person.password });
  if (error) throw error;
  return client;
}

async function follows(actor: Account) {
  const { data, error } = await admin()
    .from("notifications")
    .select("id")
    .eq("recipient_id", artist.id)
    .eq("kind", "follow")
    .eq("actor_id", actor.id);
  if (error) throw error;
  return data.length;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const person of [artist, fan, other]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.name },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
  const { error } = await admin().from("posts").insert({ author_id: artist.id, kind: "update", body: `Harbor at dusk by ${artist.handle}` });
  if (error) throw error;
});

test.afterAll(async () => {
  for (const person of [artist, fan, other]) if (person.id) await admin().auth.admin.deleteUser(person.id);
});

const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close();
});

async function signedIn(browser: Browser, person: Account) {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(person.handle);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

/** Opens a settings page and waits until its switches answer clicks. */
async function openSettings(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => {
    const el = document.querySelector('[role="switch"], main form, main button');
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps"));
  });
}

test("visitors are asked to sign in, but can still pick a theme", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Sign in to change these")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).last()).toHaveAttribute("href", "/sign-in?next=%2Fsettings");

  await page.goto("/settings/appearance");
  await page.locator("main").getByText("Ember", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ember");
  await page.locator("main").getByText("Aqua", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aqua");
});

test("the account menu leads to settings", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await expect(page.getByTestId("account-email").first()).not.toHaveText(artist.email);
});

test("a muted kind stays out of the guest book until it's switched back on", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await openSettings(page, "/settings/notifications");
  const followers = page.getByRole("switch", { name: "New followers" });
  await expect(followers).toHaveAttribute("aria-checked", "true");
  await followers.click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(followers).toHaveAttribute("aria-checked", "false");

  await (await as(fan)).from("follows").insert({ followee_id: artist.id });
  await expect.poll(() => follows(fan)).toBe(0);

  // Still muted after a reload: it's stored.
  await openSettings(page, "/settings/notifications");
  await expect(page.getByRole("switch", { name: "New followers" })).toHaveAttribute("aria-checked", "false");
  await page.getByRole("switch", { name: "New followers" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await (await as(other)).from("follows").insert({ followee_id: artist.id });
  await expect.poll(() => follows(other)).toBe(1);
});

test("nobody can read or write someone else's settings, nor mute what's always on", async () => {
  const client = await as(fan);
  const { data } = await client.from("account_settings").select("user_id").eq("user_id", artist.id);
  expect(data ?? []).toHaveLength(0);
  const { error: forged } = await client.from("account_settings").insert({ user_id: artist.id, hide_like_counts: true });
  expect(forged).not.toBeNull();
  const { error: always } = await client.from("account_settings").upsert({ muted_notifications: ["commission_request"] }, { onConflict: "user_id" });
  expect(always).not.toBeNull();
});

test("like counts hide everywhere you look, and stay hidden", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await page.goto(`/${artist.handle}`);
  const count = page.locator("[data-like-count]").first();
  await expect(count).toBeVisible();

  await openSettings(page, "/settings/privacy");
  await page.getByRole("switch", { name: "Show like counts" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-hide-likes", "");

  await page.goto(`/${artist.handle}`);
  await expect(page.locator("[data-like-count]").first()).toBeHidden();

  // Another device follows the account's setting.
  const elsewhere = await signedIn(browser, artist);
  await elsewhere.goto(`/${artist.handle}`);
  await expect(elsewhere.locator("html")).toHaveAttribute("data-hide-likes", "");

  await openSettings(page, "/settings/privacy");
  await page.getByRole("switch", { name: "Show like counts" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-hide-likes");
});

test("local time shows on the profile only when switched on", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await page.goto(`/${artist.handle}`);
  await expect(page.getByText("for Sola")).toHaveCount(0);

  await openSettings(page, "/settings/privacy");
  await page.getByRole("switch", { name: "Show your local time on your profile" }).click();
  await expect(page.getByText("Saved. It's on your profile now.")).toBeVisible();
  await page.getByLabel("Your time zone").selectOption("Asia/Tokyo");
  await expect(page.getByText("Saved. It's on your profile now.")).toBeVisible();
  const { data } = await admin().from("profiles").select("time_zone").eq("id", artist.id).single();
  expect(data?.time_zone).toBe("Asia/Tokyo");

  const visitor = await browser.newContext({ timezoneId: "Asia/Seoul" });
  contexts.push(visitor);
  const profile = await visitor.newPage();
  await profile.goto(`/${artist.handle}`);
  await expect(profile.locator('[data-part="meta"]').getByText(/for Sola · same time as you/)).toBeVisible();

  await openSettings(page, "/settings/privacy");
  await page.getByRole("switch", { name: "Show your local time on your profile" }).click();
  await expect(page.getByText("Saved. Your local time is hidden.")).toBeVisible();
  const { data: after } = await admin().from("profiles").select("time_zone").eq("id", artist.id).single();
  expect(after?.time_zone).toBeNull();
});

test("another device can be signed out from here", async ({ browser }) => {
  const page = await signedIn(browser, fan);
  await signedIn(browser, fan);
  await openSettings(page, "/settings");
  const sessions = page.getByRole("list", { name: "Signed in on" }).getByRole("listitem");
  // Both browsers (and the API clients earlier tests signed in with).
  await expect.poll(() => sessions.count()).toBeGreaterThanOrEqual(2);
  await expect(sessions.first()).toContainText("This device");
  await expect(sessions.first()).toContainText("Chrome on");

  await page.getByRole("button", { name: "Sign out everywhere else" }).click();
  await expect(sessions).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("list", { name: "Signed in on" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("Only this device is signed in.")).toBeVisible();
});

test("the password changes only with the current one", async ({ browser }) => {
  const page = await signedIn(browser, other);
  await openSettings(page, "/settings");
  await page.getByRole("button", { name: "Change" }).nth(1).click();
  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password").fill(`Lilac-wash-${run}?`);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("That isn't your current password.")).toBeVisible();

  await page.getByLabel("Current password").fill(other.password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();

  other.password = `Lilac-wash-${run}?`;
  await expect(as(other)).resolves.toBeTruthy();
});

test("changing the email takes a link to each address", async ({ browser }) => {
  const page = await signedIn(browser, fan);
  await openSettings(page, "/settings");
  const next = `e2e+moved${run}@artiflow.test`;
  await page.getByRole("button", { name: "Change" }).first().click();
  await page.getByLabel("New email").fill(next);
  await page.getByRole("button", { name: "Send the links" }).click();
  await expect(page.getByText(`Links are on their way to ${fan.email} and ${next}`)).toBeVisible();

  await page.goto(verifyLink(await latestEmailTo(fan.email)));
  await expect(page.getByText("One link down: now open the one we sent to the other address.")).toBeVisible();
  await page.goto(verifyLink(await latestEmailTo(next)));
  await expect(page.getByText("Your email is changed.")).toBeVisible();

  const { data } = await admin().auth.admin.getUserById(fan.id);
  expect(data.user?.email).toBe(next);
  fan.email = next;
});
