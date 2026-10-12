import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Follows and likes, end to end: visitors are sent to sign in; an artist
 * follows another (their count moves, the button and count survive a reload,
 * the Following feed fills, the follower's own Following count moves), likes
 * their post on the profile and on the feed, and nobody else can see who
 * liked what — only the count.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anon() {
  const { apiUrl, publishableKey } = localSupabase();
  return createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function newAccount() {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return { id: "", handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
}

const fan = newAccount();
const artist = newAccount();
let postId: string;

test.beforeAll(async () => {
  for (const account of [fan, artist]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.handle },
    });
    if (error) throw error;
    account.id = data.user.id;
  }
  const { data, error } = await admin()
    .from("posts")
    .insert({ author_id: artist.id, kind: "update", body: `Studio note from ${artist.handle}` })
    .select("id")
    .single();
  if (error) throw error;
  postId = data.id;
});

test.afterAll(async () => {
  for (const account of [fan, artist]) if (account.id) await admin().auth.admin.deleteUser(account.id);
});

async function signIn(page: Page, account: typeof fan) {
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

/** Presses a toggle once the page has hydrated, until it reports `pressed`. */
async function press(button: Locator, pressed: boolean) {
  await expect(async () => {
    if ((await button.getAttribute("aria-pressed")) !== String(pressed)) await button.click();
    await expect(button).toHaveAttribute("aria-pressed", String(pressed), { timeout: 1500 });
  }).toPass();
}

const stat = (page: Page, label: string) =>
  page.locator('[data-part="stats"] div').filter({ hasText: label }).locator("dd");

const post = (page: Page) => page.locator(`article[id="${postId}"]`);
const likeButton = (page: Page) => post(page).getByRole("button", { name: /^(Like|Unlike)$/ });

async function followRows() {
  const { data } = await admin().from("follows").select("followee_id, demo_handle").eq("follower_id", fan.id);
  return data ?? [];
}

test("visitors are sent to sign in when they follow or like", async ({ page }) => {
  await page.goto(`/${artist.handle}`);
  await expect(page.getByRole("link", { name: "Follow", exact: true })).toHaveAttribute(
    "href",
    `/sign-in?next=${encodeURIComponent(`/${artist.handle}`)}`,
  );

  await expect(async () => {
    await likeButton(page).click();
    await expect(page).toHaveURL(/\/sign-in\?next=/, { timeout: 1500 });
  }).toPass();
});

test("following moves the count, survives a reload and fills the Following feed", async ({ page }) => {
  await signIn(page, fan);
  await page.goto(`/${artist.handle}`);
  await expect(stat(page, "Followers")).toHaveText("0");

  const follow = page.getByRole("button", { name: `Follow @${artist.handle}` });
  await press(follow, true);
  await expect(page.getByRole("button", { name: `Unfollow @${artist.handle}` })).toHaveText("Following");
  await expect(stat(page, "Followers")).toHaveText("1");
  await expect.poll(followRows).toEqual([{ followee_id: artist.id, demo_handle: null }]);

  // The server remembers: the button starts as Following and the count is 1.
  await page.reload();
  await expect(page.getByRole("button", { name: `Unfollow @${artist.handle}` })).toHaveAttribute("aria-pressed", "true");
  await expect(stat(page, "Followers")).toHaveText("1");

  // Their posts reach the Following feed, and the fan's own profile counts them.
  await page.goto("/?feed=following");
  await expect(post(page)).toBeVisible();
  await page.goto(`/${fan.handle}`);
  await expect(stat(page, "Following")).toHaveText("1");

  // Demo artists can be followed too.
  await page.goto("/mira");
  await press(page.getByRole("button", { name: /^(Follow|Unfollow) @mira$/ }), true);
  await expect.poll(async () => (await followRows()).some((r) => r.demo_handle === "mira")).toBe(true);

  // Unfollowing takes it back.
  await page.goto(`/${artist.handle}`);
  await press(page.getByRole("button", { name: /^(Follow|Unfollow) @/ }), false);
  await expect(stat(page, "Followers")).toHaveText("0");
  await expect.poll(async () => (await followRows()).some((r) => r.followee_id === artist.id)).toBe(false);
});

test("likes count once, persist, and only the count is public", async ({ page }) => {
  await signIn(page, fan);
  await page.goto(`/${artist.handle}`);
  await expect(likeButton(page)).toHaveText("0");

  await press(likeButton(page), true);
  await expect(likeButton(page)).toHaveText("1");
  await expect
    .poll(async () => (await admin().from("post_likes").select("user_id").eq("post_id", postId)).data)
    .toEqual([{ user_id: fan.id }]);

  // After a reload, and on the home feed, the heart is still filled and the count is 1.
  await page.reload();
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(likeButton(page)).toHaveText("1");
  await page.goto("/");
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(likeButton(page)).toHaveText("1");

  // Who liked is private; the count isn't.
  const peek = await anon().from("post_likes").select("user_id").eq("post_id", postId);
  expect(peek.data ?? []).toEqual([]);
  const counts = await anon().rpc("post_like_counts", { post_ids: [postId], demo_post_ids: [] });
  expect(counts.data).toEqual([{ post_id: postId, demo_post_id: null, likes: 1 }]);

  // Unliking takes it back.
  await press(likeButton(page), false);
  await expect(likeButton(page)).toHaveText("0");
  await expect
    .poll(async () => (await admin().from("post_likes").select("user_id").eq("post_id", postId)).data)
    .toEqual([]);
});
