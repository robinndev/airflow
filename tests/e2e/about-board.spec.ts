import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * The About board's text blocks:
 * - new blocks come in straight (tilt 0);
 * - a list's title is styled apart from its items (font, size, bold, color,
 *   space below), and the items get their own font and italic;
 * - it all saves and shows the same on the profile;
 * - Undo / Redo (toolbar, Ctrl+Z, Ctrl+Y) take back a block added by
 *   accident, and Ctrl+Z works with a slider still in focus;
 * - stickers mirror; a color goes in by hex code, is offered again under
 *   "On your board" for the next block, and copies as a hex code.
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
    user_metadata: { handle: account.handle, display_name: account.handle },
  });
  if (error) throw error;
  cleanup.push(data.user.id);
});

test.afterAll(async () => {
  for (const userId of cleanup) await admin().auth.admin.deleteUser(userId);
});

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

test("a list's title and items are styled apart, and the block comes in straight", async ({ page }) => {
  await signIn(page);
  await page.goto("/customize?tab=about");
  const addList = page.getByRole("button", { name: "List", exact: true });
  await hydrated(page, "main button");
  await addList.click();

  const title = page.getByRole("group", { name: "Title" });
  await expect(title.getByLabel("Title", { exact: true })).toHaveValue("Likes");
  await title.getByRole("radiogroup", { name: "Title font" }).getByRole("radio", { name: "Hand" }).click();
  await title.getByRole("slider", { name: /^Size/ }).fill("40");
  await title.getByRole("button", { name: "Bold" }).click();
  await title.getByRole("slider", { name: /^Space below/ }).fill("0");

  const items = page.getByRole("group", { name: "Items" });
  await items.getByRole("radiogroup", { name: "Items font" }).getByRole("radio", { name: "Pixel" }).click();
  await items.getByRole("button", { name: "Italic" }).click();

  // The editor's preview follows along.
  const preview = page.locator('[data-part="block-title"]').first();
  await expect(preview).toHaveText("Likes");
  await expect(preview).toHaveAttribute("style", /font-size: ?calc\(var\(--u\) \* 40\)/);
  await expect(preview).toHaveCSS("font-family", /Caveat/);
  await expect(preview).toHaveCSS("font-weight", "400");
  await expect(page.locator("li", { hasText: "Your favorite things" }).first()).toHaveCSS("font-style", "italic");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved — live on your page")).toBeVisible();

  const { data } = await admin().from("profiles").select("about").eq("handle", account.handle).single();
  const [block] = (data as { about: { blocks: Record<string, unknown>[] } }).about.blocks;
  expect(block).toMatchObject({
    type: "list",
    title: "Likes",
    rotate: 0,
    font: "pixel",
    italic: true,
    titleStyle: { font: "hand", size: 40, bold: false, gap: 0 },
  });

  // The profile shows it the same way.
  await page.goto(`/${account.handle}/about`);
  const shown = page.locator('[data-part="board"] [data-part="block-title"]').first();
  await expect(shown).toHaveAttribute("style", /font-size: ?calc\(var\(--u\) \* 40\)/);
  await expect(shown).toHaveCSS("font-family", /Caveat/);
});

test("undo takes back a block added by accident, from the toolbar or the keyboard", async ({ page }) => {
  await signIn(page);
  await page.goto("/customize?tab=about");
  await hydrated(page, "main button");
  const blocks = page.getByRole("application", { name: /About board editor/ }).locator("[data-block]");
  const before = await blocks.count();
  const history = page.getByRole("toolbar", { name: "Board history" });

  // A sticker by accident: Undo takes it back, Redo puts it back.
  await page.getByRole("button", { name: "Sticker", exact: true }).click();
  await page.getByRole("button", { name: "Add heart sticker" }).click();
  await expect(blocks).toHaveCount(before + 1);
  await history.getByRole("button", { name: "Undo" }).click();
  await expect(blocks).toHaveCount(before);
  await history.getByRole("button", { name: "Redo" }).click();
  await expect(blocks).toHaveCount(before + 1);

  // Ctrl+Z with the Tilt slider still in focus undoes the tilt first, then the sticker.
  const sticker = blocks.last();
  await sticker.click();
  await page.getByRole("slider", { name: /^Tilt/ }).fill("20");
  await expect(sticker).toHaveAttribute("style", /rotate: 20deg/);
  await page.keyboard.press("Control+z");
  await expect(sticker).toHaveAttribute("style", /rotate: 0deg/);
  await page.keyboard.press("Control+z");
  await expect(blocks).toHaveCount(before);
  await page.keyboard.press("Control+y");
  await expect(blocks).toHaveCount(before + 1);
});

/** A sticker's own drawing (the selected block also holds its handles' icons). */
const art = (block: Locator) => block.locator('svg[viewBox="0 0 100 100"]');

test.describe("colors and mirroring", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("a sticker mirrors, and its hex color carries over to the next one", async ({ page }) => {
    await signIn(page);
    await page.goto("/customize?tab=about");
    await hydrated(page, "main button");
    const blocks = page.getByRole("application", { name: /About board editor/ }).locator("[data-block]");

    await page.getByRole("button", { name: "Sticker", exact: true }).click();
    await page.getByRole("button", { name: "Add heart sticker" }).click();
    const heart = blocks.last();

    // Mirror from the block's floating toolbar.
    const mirror = page.getByRole("application").getByRole("button", { name: "Mirror" });
    await mirror.click();
    await expect(mirror).toHaveAttribute("aria-pressed", "true");
    await expect(art(heart)).toHaveCSS("scale", "-1 1");

    // A typed (or pasted) hex code colors the sticker.
    const hex = page.getByLabel("Sticker color: hex code");
    await hex.fill("#1a2b3c");
    await expect(art(heart).locator("path").nth(1)).toHaveAttribute("fill", "#1a2b3c");
    await expect(hex).toHaveValue("1A2B3C");

    // The next sticker is offered that color under "On your board".
    await page.getByRole("button", { name: "Add star sticker" }).click();
    const star = blocks.last();
    await page.getByRole("button", { name: "Sticker color: #1a2b3c, on your board" }).click();
    await expect(art(star).locator("path").nth(1)).toHaveAttribute("fill", "#1a2b3c");

    // Copy puts the code on the clipboard.
    await page.getByRole("button", { name: "Copy Sticker color hex code" }).click();
    await expect(page.getByRole("button", { name: "Copy Sticker color hex code" })).toContainText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("#1A2B3C");
  });
});
