import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Favorites, end to end: visitors are sent to sign in when they save; an
 * artist saves a post on the feed, a piece on Explore's wall and a commission,
 * finds all three on /favorites, unpins one and puts it back with Undo, and
 * the save buttons remember their state across visits.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const account = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
let userId: string;

test.beforeAll(async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { handle: account.handle, display_name: account.handle },
  });
  if (error) throw error;
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin().auth.admin.deleteUser(userId);
});

async function signIn(page: Page) {
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

/** Clicks a save button once the page has hydrated, and waits for it to say it's saved. */
async function save(button: Locator) {
  await expect(async () => {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1500 });
  }).toPass();
}

async function savedRows() {
  const { data } = await admin().from("favorites").select("kind, demo_id, created_at").eq("user_id", userId);
  return data ?? [];
}

test("visitors are sent to sign in when they save", async ({ page }) => {
  await page.goto("/mira/commissions");
  const button = page.getByRole("button", { name: "Save Half-body illustration to favorites" }).first();
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fmira%2Fcommissions/, { timeout: 1500 });
  }).toPass();

  await page.goto("/favorites");
  await expect(page.getByRole("heading", { name: "Your moodboard lives in your account." })).toBeVisible();
});

test("saves from the feed, Explore and commissions land on the moodboard", async ({ page }) => {
  await signIn(page);

  // A post on the home feed.
  await page.goto("/");
  await save(page.locator("article#pst_3").getByRole("button", { name: "Save to favorites" }));
  await expect(page.getByRole("status")).toContainText("Saved to favorites");

  // A piece on Explore's wall (the heart), and a commission service.
  await page.goto("/explore");
  await save(page.getByRole("button", { name: "Favorite Golden Hour" }));
  await page.goto("/mira/commissions");
  await save(page.getByRole("button", { name: "Save Half-body illustration to favorites" }).first());

  await expect.poll(async () => (await savedRows()).map((r) => `${r.kind}:${r.demo_id}`).sort()).toEqual([
    "art:art_1",
    "post:pst_3",
    "service:svc_halfbody",
  ]);

  await page.goto("/favorites");
  const line = page.getByRole("region", { name: "Saving up for" });
  const wall = page.getByRole("region", { name: "Stopped you mid-scroll" });
  await expect(line.getByRole("link", { name: /Half-body illustration/ })).toBeVisible();
  await expect(wall.getByRole("link", { name: /Golden Hour/ })).toBeVisible();
  await expect(wall.getByRole("link", { name: /Two pieces for my/ })).toBeVisible();
  await expect(page.getByText("Mixed from 3 favorites.")).toBeVisible();

  // Unpin, then Undo puts it back where it was.
  const before = (await savedRows()).find((r) => r.demo_id === "art_1");
  await expect(async () => {
    await wall.getByRole("button", { name: "Unpin Golden Hour" }).click({ timeout: 1500 });
    await expect(wall.getByRole("link", { name: /Golden Hour/ })).toBeHidden({ timeout: 1500 });
  }).toPass();
  await expect.poll(async () => (await savedRows()).some((r) => r.demo_id === "art_1")).toBe(false);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(wall.getByRole("link", { name: /Golden Hour/ })).toBeVisible();
  await expect
    .poll(async () => (await savedRows()).find((r) => r.demo_id === "art_1")?.created_at)
    .toBe(before?.created_at);

  // Filters: only posts.
  await wall.getByRole("button", { name: /^Posts/ }).click();
  await expect(wall.getByRole("link", { name: /Golden Hour/ })).toBeHidden();
  await expect(wall.getByRole("link", { name: /Two pieces for my/ })).toBeVisible();

  // Save buttons remember: the commission shows as saved, and unsaving takes it off the board.
  await page.goto("/mira/commissions");
  const saved = page.getByRole("button", { name: "Remove Half-body illustration from favorites" }).first();
  await expect(saved).toHaveAttribute("aria-pressed", "true");
  await saved.click();
  await expect.poll(async () => (await savedRows()).some((r) => r.demo_id === "svc_halfbody")).toBe(false);
  await page.goto("/favorites");
  await expect(page.getByRole("region", { name: "Saving up for" })).toHaveCount(0);
});
