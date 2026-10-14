import { expect, test, type Page } from "@playwright/test";

/*
 * Explore's salon wall, as a visitor: the header leads there; tabs, palette,
 * "open for commissions" and search are links (the URL is the state); the
 * viewer opens a piece, walks the wall and closes back on the tile it ended
 * on; the next page loads near the end; the tile size sticks. The demo data
 * alone hangs more than one page.
 */

const tiles = (page: Page) => page.locator('[data-part="wall-tile"]');
/** The wall loads its next page early (before the end is on screen), so a full first page shows as "at least 60". */
const fullPage = (page: Page) => expect.poll(() => tiles(page).count()).toBeGreaterThanOrEqual(60);
const wall = (page: Page) => page.getByRole("list", { name: "Art" });

test("the header's Explore menu leads to the wall", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore" }).click();
  await page.getByRole("link", { name: /Explore the wall/ }).click();
  await page.waitForURL(/\/explore$/);
  await expect(page.getByRole("heading", { level: 1, name: "Everything, wall to wall." })).toBeVisible();
  await fullPage(page);
});

test("tabs, palette, open for commissions and search narrow the wall", async ({ page }) => {
  await page.goto("/explore");
  const show = page.getByRole("navigation", { name: "Show" });

  await show.getByRole("link", { name: /^Adoptables/ }).click();
  await page.waitForURL(/show=adoptables/);
  await expect(show.getByRole("link", { name: /^Adoptables/ })).toHaveAttribute("aria-current", "page");
  for (const name of await wall(page).getByRole("link").allTextContents()) expect(name).toMatch(/Adopt/);

  await page.getByRole("group", { name: "Palette" }).getByRole("link", { name: /^Cotton Candy/ }).click();
  await page.waitForURL(/show=adoptables&color=cotton-candy/);
  await page.getByRole("link", { name: "Remove Cotton Candy" }).click();
  await page.waitForURL((url) => !url.search.includes("color="));

  await show.getByRole("link", { name: /^Everything/ }).click();
  await page.getByRole("link", { name: "Open for commissions" }).click();
  await page.waitForURL(/open=1/);
  await expect(tiles(page).first()).toBeVisible();

  // Search keeps the other filters; Kinako is a character.
  await page.getByRole("searchbox", { name: "Search the wall" }).fill("kinako");
  await page.keyboard.press("Enter");
  await page.waitForURL(/q=kinako/);
  expect(new URL(page.url()).searchParams.get("open")).toBe("1");
  await expect(wall(page).getByRole("link", { name: /^Kinako by Pebble\. Character, Fox spirit/ })).toBeVisible();

  await page.goto("/explore?q=qxqxqxq");
  await expect(page.getByText("Nothing hanging here yet")).toBeVisible();
  await page.getByRole("link", { name: "Drop the search" }).click();
  await fullPage(page);
});

test("the viewer opens a piece, walks the wall and closes on the last one", async ({ page }) => {
  await page.goto("/explore?sort=new");
  await tiles(page).nth(2).getByRole("link").click();

  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  const first = await viewer.getByRole("heading", { level: 2 }).textContent();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByRole("heading", { level: 2 })).not.toHaveText(first ?? "");
  const second = await viewer.getByRole("heading", { level: 2 }).textContent();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(tiles(page).nth(3).getByRole("link")).toBeFocused();
  await expect(tiles(page).nth(3).getByRole("link")).toContainText(second ?? "");
});

test("the next page hangs as the end of the wall comes near", async ({ page }) => {
  // The server renders one page…
  const html = await (await page.request.get("/explore")).text();
  expect(html.match(/data-part="wall-tile"/g)).toHaveLength(60);
  // …and the rest come as you scroll, with nothing hung twice.
  await page.goto("/explore");
  await page.locator('[data-part="wall-tile"]').last().scrollIntoViewIfNeeded();
  await expect.poll(() => tiles(page).count()).toBeGreaterThan(60);
  const ids = await tiles(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-wall-id")));
  expect(new Set(ids).size).toBe(ids.length);
});

test("the tile size sticks across visits", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Small tiles" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-wall-size", "s");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-wall-size", "s");
  await expect(page.getByRole("button", { name: "Small tiles" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Medium tiles" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-wall-size", /./);
});

test("the open studios board moved to /explore/studios", async ({ page }) => {
  await page.goto("/explore/studios");
  await expect(page.getByRole("heading", { name: "Open studios" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Explore the wall" }).first().click();
  await page.waitForURL(/\/explore$/);
});
