import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./support/local-supabase";

/*
 * What artists draw, and pictures as they are:
 * - sign-up asks "What do you draw?" and the profile keeps it (unknown tags
 *   from metadata are dropped by the trigger, never fatal);
 * - the profile shows the labels, Edit profile adds specialties, and a label
 *   opens Explore's open studios filtered to it;
 * - a new profile picture / cover is framed (zoom + position) before upload;
 * - a small transparent PNG lands on the About board at its real size, with
 *   no frame and its see-through pixels intact.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const account = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
const cleanup: string[] = [];

test.beforeAll(async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    // "nope" and 3 aren't tags: the trigger drops them and still makes the profile.
    user_metadata: { handle: account.handle, display_name: account.handle, draws: ["feral", "nope", 3] },
  });
  if (error) throw error;
  cleanup.push(data.user.id);
});

test.afterAll(async () => {
  for (const userId of cleanup) await admin().auth.admin.deleteUser(userId);
});

async function profileRow(handle: string) {
  const { data } = await admin().from("profiles").select("id, draws, avatar, banner").eq("handle", handle).single();
  return data as { id: string; draws: string[]; avatar: { path: string; width: number; height: number } | null; banner: { path: string; width: number; height: number } | null };
}

async function hydrated(page: Page, selector = "main form") {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps"));
  }, selector);
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await hydrated(page);
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

const opaque = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 90, g: 160, b: 230 } } }).png().toBuffer();

/** A 50×50 pink dot on a fully transparent square. */
const transparentDot = () =>
  sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><circle cx="25" cy="25" r="14" fill="#ff6fa5"/></svg>'))
    .png()
    .toBuffer();

test("sign-up asks what you draw and the profile keeps it", async ({ page }) => {
  const joinId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const handle = `e2e_${joinId}`;
  await page.goto("/join");
  await hydrated(page);
  await page.getByLabel("Your handle").fill(handle);
  await page.getByLabel("Email").fill(`e2e+${joinId}@artiflow.test`);
  await page.getByLabel("Password", { exact: true }).fill(`Teal-brush-${joinId}!`);

  const draws = page.getByRole("group", { name: "What do you draw?" });
  await draws.getByRole("button", { name: "Anthro / furry" }).click();
  await draws.getByRole("button", { name: "Ponies" }).click();
  await expect(draws.getByRole("button", { name: "Ponies" })).toHaveAttribute("aria-pressed", "true");
  // "All of them" ticks every subject; a second click clears them.
  await draws.getByRole("button", { name: "All of them" }).click();
  await expect(draws.getByRole("button", { name: "Humans" })).toHaveAttribute("aria-pressed", "true");
  await draws.getByRole("button", { name: "All of them" }).click();
  await expect(draws.getByRole("button", { name: "Ponies" })).toHaveAttribute("aria-pressed", "false");
  await draws.getByRole("button", { name: "Anthro / furry" }).click();
  await draws.getByRole("button", { name: "Ponies" }).click();

  await page.getByText("I agree to Artiflow").click();
  await page.getByRole("button", { name: "Open my studio" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Account created" })).toBeVisible();

  const row = await profileRow(handle);
  cleanup.push(row.id);
  expect(row.draws).toEqual(["anthro", "pony"]);
});

test("labels on the profile, specialties from Edit profile, and a label opens Explore filtered", async ({ page }) => {
  expect((await profileRow(account.handle)).draws).toEqual(["feral"]);
  await signIn(page);
  await page.goto(`/${account.handle}`);
  const labels = page.locator('[data-part="draws"]');
  await expect(labels.getByRole("link", { name: "Feral artist" })).toBeVisible();

  await page.getByRole("button", { name: "Edit profile" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await dialog.getByRole("group", { name: "what do you draw?" }).getByRole("button", { name: "Pixel art" }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(labels.getByRole("link", { name: "Pixel artist" })).toBeVisible();
  expect((await profileRow(account.handle)).draws).toEqual(["feral", "pixel"]);

  await labels.getByRole("link", { name: "Feral artist" }).click();
  await page.waitForURL(/\/explore\?draws=feral/);
  const filter = page.getByRole("group", { name: "Who should they draw?" });
  await expect(filter.getByRole("button", { name: "Ferals" })).toHaveAttribute("aria-pressed", "true");
  const studios = page.locator("#studios");
  await expect(studios.getByText("Bramble", { exact: true }).first()).toBeVisible(); // furry: anthro + feral
  await expect(studios.getByText("Juno Park", { exact: true })).toBeHidden(); // backgrounds only

  await filter.getByRole("button", { name: "Anyone" }).click();
  await expect(page).not.toHaveURL(/draws=/);
  await expect(studios.getByText("Juno Park", { exact: true }).first()).toBeVisible();
});

test("a new profile picture and cover are framed before they upload", async ({ page }) => {
  await signIn(page);
  await page.goto(`/${account.handle}`);
  await hydrated(page, '[data-part="avatar"] button');

  // Picture: 800×400, so the square window starts on a 400×400 middle; zoom in twice.
  await page.locator('[data-part="avatar"] input[type="file"]').setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: await opaque(800, 400) });
  const picture = page.getByRole("dialog", { name: "Frame your picture" });
  await expect(picture).toBeVisible();
  await picture.getByRole("button", { name: "Zoom in" }).click();
  await picture.getByRole("button", { name: "Zoom in" }).click();
  await expect(picture.getByRole("slider", { name: "Zoom" })).not.toHaveValue("1");
  await picture.getByRole("button", { name: "Apply" }).click();
  await expect(picture).toBeHidden();
  await expect.poll(async () => (await profileRow(account.handle)).avatar, { timeout: 15_000 }).not.toBeNull();
  const avatar = (await profileRow(account.handle)).avatar!;
  expect(avatar.width).toBe(avatar.height);
  expect(avatar.width).toBeLessThan(400);

  // Cover: 1200×900 comes out 10:3, full width.
  await page.locator('[data-part="banner"] input[type="file"]').setInputFiles({ name: "tall.png", mimeType: "image/png", buffer: await opaque(1200, 900) });
  const cover = page.getByRole("dialog", { name: "Frame your cover" });
  await expect(cover.getByText("Phones show this part")).toBeVisible();
  await cover.getByRole("button", { name: "Apply" }).click();
  await expect.poll(async () => (await profileRow(account.handle)).banner, { timeout: 15_000 }).not.toBeNull();
  const banner = (await profileRow(account.handle)).banner!;
  expect(banner.width).toBe(1200);
  expect(banner.height).toBe(360);
});

test("a small transparent PNG goes on the About board at its real size, see-through", async ({ page }) => {
  await signIn(page);
  await page.goto("/customize?tab=about");
  await hydrated(page, 'input[type="file"][accept*="image/png"]');
  await page.locator('input[type="file"][accept*="image/png"]').first().setInputFiles({ name: "doodle.png", mimeType: "image/png", buffer: await transparentDot() });

  const image = page.getByRole("img", { name: "doodle" });
  await expect(image).toBeVisible({ timeout: 15_000 });
  // 50px on a desktop profile = 63 board units (the board is 1000 units over 796px); no polaroid paper around it.
  const block = image.locator("xpath=ancestor::div[contains(@style, 'width')][1]");
  await expect(block).toHaveAttribute("style", /width: calc\(var\(--u\) \* 63\)/);
  await expect(page.locator(".bg-white").filter({ has: image })).toHaveCount(0);

  // Kept lossless with its alpha: the corner is still see-through.
  // Served as uploaded, straight from storage (the image loader only adds a `#w=` mark).
  const src = await image.getAttribute("src");
  expect(src).toMatch(/\/storage\/v1\/object\/public\/art\/.+\.png(#w=\d+)?$/);
  const file = Buffer.from(await (await page.request.get(src!)).body());
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(50);
  expect(data[3]).toBe(0); // top-left pixel's alpha
});
