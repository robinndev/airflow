import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Followers and following lists (`/[handle]/followers`, `/following`):
 * opened from the profile's stats card; on your own lists you follow back
 * and unfollow (the card stays, with Undo); on someone else's you see who on
 * the list also follows you; visitors are sent to sign in; long lists page
 * and search.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Account = { id: string; handle: string; email: string; password: string };

function newAccount(): Account {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return { id: "", handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
}

const me = newAccount();
const artist = newAccount();
/** Follows me, and I follow back. */
const friend = newAccount();
/** Follows me and the artist; I don't follow back yet. */
const fan = newAccount();
/** Follows the artist only. */
const stranger = newAccount();
/** More of the artist's followers, so the list runs past one page. */
const crowd = Array.from({ length: 23 }, newAccount);
const everyone = [me, artist, friend, fan, stranger, ...crowd];

// One set of accounts, tests in order (each leaves the others' state alone).
test.describe.configure({ mode: "default" });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  for (const account of everyone) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.handle },
    });
    if (error) throw error;
    account.id = data.user.id;
  }
  // Newest first on the lists: the crowd goes in first, so the fan and the stranger lead the artist's page.
  const follows = [
    ...crowd.map((account) => [account, artist]),
    [friend, me],
    [me, friend],
    [fan, me],
    [fan, artist],
    [stranger, artist],
  ];
  for (const [follower, followee] of follows) {
    const { error } = await admin().from("follows").insert({ follower_id: follower.id, followee_id: followee.id });
    if (error) throw error;
  }
});

test.afterAll(async () => {
  for (const account of everyone) if (account.id) await admin().auth.admin.deleteUser(account.id);
});

async function signIn(page: Page, account: Account) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

// Next keeps the page you came from in the DOM, hidden: only count what's on screen.
const cards = (page: Page) => page.locator('[data-part="person"]:visible');

const card = (page: Page, account: Account) =>
  cards(page).filter({ has: page.getByText(`@${account.handle}`, { exact: true }) });

const followButton = (page: Page, account: Account) =>
  card(page, account).getByRole("button", { name: new RegExp(`@${account.handle}$`) });

/** Presses a card's button once it knows its state, until it reports `pressed`. */
async function press(button: Locator, pressed: boolean) {
  await expect(button).toHaveAttribute("aria-pressed", /^(true|false)$/);
  await expect(async () => {
    if ((await button.getAttribute("aria-pressed")) !== String(pressed)) await button.click();
    await expect(button).toHaveAttribute("aria-pressed", String(pressed), { timeout: 1500 });
  }).toPass();
}

async function isFollowing(follower: Account, followee: Account) {
  const { count } = await admin()
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", follower.id)
    .eq("followee_id", followee.id);
  return count === 1;
}

test("the stats card opens the lists", async ({ page }) => {
  await page.goto(`/${me.handle}`);
  const stat = page.locator('[data-part="stats"] div').filter({ hasText: "Followers" });
  await expect(stat.locator("dd")).toHaveText("2");
  await stat.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/${me.handle}/followers$`));
  await expect(page.getByRole("heading", { name: "Followers", level: 2 })).toBeVisible();
  await expect(card(page, friend)).toBeVisible();
  await expect(card(page, fan)).toBeVisible();

  await page.getByRole("navigation", { name: /follows/ }).getByRole("link", { name: /Following/ }).click();
  await expect(page).toHaveURL(new RegExp(`/${me.handle}/following$`));
  await expect(card(page, friend)).toBeVisible();
  await expect(card(page, fan)).toHaveCount(0);
});

test("on your own followers: follow back", async ({ page }) => {
  await signIn(page, me);
  await page.goto(`/${me.handle}/followers`);

  // Everyone here follows you, so no stamp says so; the buttons tell who you follow back.
  await expect(card(page, friend).getByText("Follows you")).toHaveCount(0);
  await expect(followButton(page, friend)).toHaveText(/Following/);
  await expect(followButton(page, fan)).toHaveText(/Follow back/);

  await press(followButton(page, fan), true);
  await expect(followButton(page, fan)).toHaveText(/Following|Unfollow/);
  await expect.poll(() => isFollowing(me, fan)).toBe(true);

  await page.reload();
  await expect(followButton(page, fan)).toHaveAttribute("aria-pressed", "true");
});

test("unfollowing keeps the card, with Undo", async ({ page }) => {
  await signIn(page, me);
  await page.goto(`/${me.handle}/following`);

  await press(followButton(page, friend), false);
  // They still follow you: the card stays and offers to follow back.
  await expect(card(page, friend)).toBeVisible();
  await expect(followButton(page, friend)).toHaveText(/Follow back/);
  await expect(card(page, friend).getByText("Follows you")).toBeVisible();
  await expect.poll(() => isFollowing(me, friend)).toBe(false);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(followButton(page, friend)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => isFollowing(me, friend)).toBe(true);
});

test("on someone else's list: who also follows you", async ({ page }) => {
  await signIn(page, me);
  await page.goto(`/${artist.handle}/followers`);

  const mutual = page.getByRole("button", { name: /Also follow you/ });
  await expect(mutual).toContainText("1");
  await expect(card(page, fan).getByText("Follows you")).toBeVisible();
  await expect(card(page, stranger).getByText("Follows you")).toHaveCount(0);

  await mutual.click();
  await expect(mutual).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, fan)).toBeVisible();

  await page.getByRole("button", { name: /^Everyone/ }).click();
  await expect(card(page, stranger)).toBeVisible();
});

test("visitors are sent to sign in", async ({ page }) => {
  await page.goto(`/${artist.handle}/followers`);
  await expect(page.getByRole("button", { name: /Also follow you/ })).toHaveCount(0);
  const button = followButton(page, stranger);
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/sign-in\?next=/, { timeout: 1500 });
  }).toPass();
  expect(decodeURIComponent(page.url())).toContain(`/${artist.handle}/followers`);
});

test("a long list pages and searches", async ({ page }) => {
  await page.goto(`/${artist.handle}/followers`);
  await expect(cards(page)).toHaveCount(24);

  await page.getByRole("button", { name: "Show 1 more" }).click();
  await expect(cards(page)).toHaveCount(24 + 1);
  await expect(page.getByRole("button", { name: /^Show \d+ more$/ })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Find someone on this list" }).fill(`@${stranger.handle}`);
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, stranger)).toBeVisible();

  await page.getByRole("searchbox", { name: "Find someone on this list" }).fill("nobody-by-that-name");
  await expect(page.getByText(/No one called/)).toBeVisible();
});
