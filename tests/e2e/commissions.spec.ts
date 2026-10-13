import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * My commissions (/commissions), end to end, on real orders: an artist with
 * none yet gets an empty board pointing at their studio; a request someone
 * sends lands as a ticket (it can't be dragged), the planner and the ledger
 * show the same order, search finds it, and answering it from the drawer
 * moves it to "Client's turn". Visitors get a sign-in note. The whole order
 * (quote → paid → delivered) is covered in listings.spec.ts.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const artist = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
const client = { handle: `e2e_c${id.slice(1)}`, email: `e2e+c${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Juniper ${id.slice(0, 4)}` };
const ids: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const account of [artist, client]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: "name" in account ? account.name : account.handle },
    });
    if (error) throw error;
    ids.push(data.user.id);
  }
});

test.afterAll(async () => {
  for (const userId of ids) await admin().auth.admin.deleteUser(userId);
});

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(artist.handle);
  await page.getByLabel("Password", { exact: true }).fill(artist.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

/** The workspace is a client island; wait until React owns it before clicking. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const tabs = document.querySelector('[role="tablist"]');
    return !!tabs && Object.keys(tabs).some((key) => key.startsWith("__reactProps"));
  });
}

const lane = (page: Page, name: string) => page.locator(`[data-lane="${name}"]`);

test("no orders yet: an empty board that points at the studio", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: "My commissions" }).click();
  await expect(page).toHaveURL(/\/commissions$/);
  await expect(page.getByText("No commissions yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "List a service" })).toHaveAttribute("href", "/studio");
  await expect(page.locator("[data-order]")).toHaveCount(0);
});

test("a real request lands as a ticket, in the board and the ledger, and is answered from its drawer", async ({ page }) => {
  const { data: request, error } = await admin()
    .from("commission_requests")
    .insert({
      buyer_id: ids[1],
      artist_id: ids[0],
      service_title: "Custom piece",
      description: "Juniper, a sleepy fox mage with a moss-green scarf. Soft light please!",
      budget: "50-150",
    })
    .select("id")
    .single();
  if (error) throw error;
  const ticket = `[data-order="${request.id}"]`;

  await signIn(page);
  await page.goto("/commissions");
  await hydrated(page);
  await expect(page.getByText("No commissions yet.")).toHaveCount(0);
  await expect(lane(page, "request").locator(ticket)).toBeVisible();
  // Orders move only as they're processed: no dragging.
  await expect(page.locator(ticket)).toHaveAttribute("draggable", "false");
  await expect(page.getByRole("tab", { name: /Needs you/ })).toContainText("1");

  // The ledger is the same queue; search finds it by the client's name.
  await page.getByRole("button", { name: "Ledger" }).click();
  await expect(page).toHaveURL(/view=ledger/);
  await expect(page.locator(`tr${ticket}`)).toBeVisible();
  await page.getByPlaceholder("Client, character or No.").fill(client.name.toLowerCase());
  await expect(page.locator(`tr${ticket}`)).toBeVisible();
  await page.getByPlaceholder("Client, character or No.").fill("nobody-by-that-name");
  await expect(page.locator(`tr${ticket}`)).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search" }).click();

  // Answered with a quote from the drawer: it's the client's turn now.
  await page.getByRole("button", { name: "Board" }).click();
  await page.locator(ticket).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Price").fill("75");
  await drawer.getByRole("button", { name: "Send quote" }).click();
  await expect(drawer.getByText("Quote sent: $75")).toBeVisible();
  await expect
    .poll(async () => (await admin().from("commission_requests").select("status").eq("id", request.id).single()).data?.status)
    .toBe("quoted");
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(lane(page, "proposal").locator(ticket)).toBeVisible();

  // It stays where it is after a reload: the server has it.
  await page.reload();
  await expect(lane(page, "proposal").locator(ticket)).toBeVisible();
  await page.getByRole("tab", { name: /Client's turn/ }).click();
  await expect(page.locator(ticket)).toBeVisible();
});

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/commissions");
  await expect(page.getByText("Your commission queue lives here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/sign-in?next=/commissions");
});
