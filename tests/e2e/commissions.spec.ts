import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * My commissions (/commissions), end to end: an artist opens it from the
 * account menu, drags a ticket onto the easel, sets and undoes a step, and
 * finds it still there after a reload; answers a request from its drawer and
 * sees the same queue in the ledger; puts the sample back with Reset.
 * Visitors get a sign-in note. The queue is the sample until the commission
 * flow lands, so the tickets are the sample's (src/lib/commissions/sample.ts).
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

/** The workspace is a client island; wait until React owns it before dragging or clicking. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const tabs = document.querySelector('[role="tablist"]');
    return !!tabs && Object.keys(tabs).some((key) => key.startsWith("__reactProps"));
  });
}

const lane = (page: Page, name: string) => page.locator(`[data-lane="${name}"]`);

/** Drags a ticket by its stub to another column in small steps, the way a hand does (a single jump never starts a drag). */
async function dragTicket(page: Page, ticket: string, to: string) {
  await page.locator("#queue-panel").evaluate((panel) => panel.scrollIntoView({ block: "start" }));
  const source = (await page.locator(ticket).boundingBox())!;
  const target = (await lane(page, to).boundingBox())!;
  await page.mouse.move(source.x + 40, source.y + source.height - 20);
  await page.mouse.down();
  await page.mouse.move(source.x + 60, source.y + source.height - 10, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 160, { steps: 12 });
  await page.mouse.up();
}
const toast = (page: Page) => page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) });

test("an artist moves a ticket onto the easel and it stays there", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: "My commissions" }).click();
  await expect(page).toHaveURL(/\/commissions$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On your easel.");
  await expect(page.getByText("These are sample orders.")).toBeVisible();
  await hydrated(page);

  // Lune's half-body is paid and waiting: drag it from Up next onto the easel.
  const lune = '[data-order="ord_0046"]';
  await expect(lane(page, "queued").locator(lune)).toBeVisible();
  await dragTicket(page, lune, "wip");
  await expect(lane(page, "wip").locator(lune)).toBeVisible();
  await expect(toast(page)).toContainText("On the easel");
  await expect(lane(page, "wip").locator(lune)).toContainText("Sketch");

  // One click on a paint stroke sets the step; Undo takes it back.
  await lane(page, "wip").locator(lune).getByRole("button", { name: "Set progress to Lineart" }).click();
  await expect(lane(page, "wip").locator(lune)).toContainText("Lineart");
  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(lane(page, "wip").locator(lune)).toContainText("Sketch");

  // Changes are kept on this device.
  await page.reload();
  await hydrated(page);
  await expect(lane(page, "wip").locator(lune)).toBeVisible();
  await expect(lane(page, "queued").locator(lune)).toHaveCount(0);
});

test("a request is answered from its drawer, and the ledger shows the same queue", async ({ page }) => {
  await signIn(page);
  await page.goto("/commissions");
  await hydrated(page);

  const marrow = '[data-order="ord_0051"]';
  await page.locator(marrow).getByRole("button", { name: "Full-body illustration" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Take this one on?")).toBeVisible();
  await drawer.getByRole("button", { name: "Accept & send proposal" }).click();
  await expect(drawer.getByRole("button", { name: "Awaiting payment" })).toHaveAttribute("aria-pressed", "true");
  await expect(drawer.getByText("Waiting on Marrow")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(lane(page, "proposal").locator(marrow)).toContainText("Invoice sent");

  // The ledger and the tabs live in the URL.
  await page.getByRole("button", { name: "Ledger" }).click();
  await expect(page).toHaveURL(/view=ledger/);
  await page.getByRole("tab", { name: /Client's turn/ }).click();
  await expect(page).toHaveURL(/tab=client/);
  const rows = page.locator("tbody tr[data-order]");
  await expect(rows).toHaveCount(3);
  await expect(page.locator(`tr${marrow}`)).toContainText("Awaiting payment");

  // Search narrows it down.
  await page.getByRole("searchbox", { name: "Search commissions" }).fill("juniper");
  await expect(rows).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();

  // Reset puts the sample back.
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator(`tr${marrow}`)).toHaveCount(0);
});

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/commissions");
  await expect(page.getByText("Your commission queue lives here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/sign-in?next=/commissions");
});
