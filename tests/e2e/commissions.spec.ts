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
// "k" never appears in the hex id, so the client's handle can't equal the artist's.
const client = { handle: `e2e_k${id.slice(1)}`, email: `e2e+c${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Juniper ${id.slice(0, 4)}` };
const ids: string[] = [];
let quotedId = "";

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
  // Selling takes artist access (an artist code); the team can also give it by hand.
  const { error } = await admin().rpc("set_artist_access", { handle: artist.handle, artist: true });
  if (error) throw error;
});

test.afterAll(async () => {
  for (const userId of ids) await admin().auth.admin.deleteUser(userId);
});

async function signIn(page: Page, as: { handle: string; password: string } = artist) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(as.handle);
  await page.getByLabel("Password", { exact: true }).fill(as.password);
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
  await page.locator("#account-menu").getByRole("link", { name: "My commissions" }).click();
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
  quotedId = request.id;
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

test("a buyer who says no to the quote says why, and the artist reads it", async ({ browser }) => {
  // The client declines the quote from the previous test, with a reason and a note.
  const buyer = await browser.newPage();
  await signIn(buyer, client);
  await buyer.goto("/requests");
  const postcard = buyer.locator(`[data-request="${quotedId}"]`);
  await postcard.getByRole("button", { name: "Decline the quote" }).click();
  const why = buyer.getByRole("dialog", { name: "Why are you declining this quote?" });
  await why.getByText("The price is more than I can pay").click();
  await why.getByLabel(/A note for/).fill("I'm saving up, I'd love to ask again next month.");
  await why.getByRole("button", { name: "Decline the quote" }).click();
  await expect(why).toBeHidden();
  await expect(postcard).toContainText("You told");
  await buyer.close();

  // The artist's notice, on the header's order clipboard (not the bell), says what happened and why, and opens the order.
  const page = await browser.newPage();
  await signIn(page);
  const nav = page.getByRole("navigation", { name: "Main" });
  const clipboard = nav.getByRole("button", { name: /^Commissions/ });
  // The header streams in as a client island: click until it answers.
  await expect(async () => {
    if ((await clipboard.getAttribute("aria-expanded")) !== "true") await clipboard.click();
    await expect(clipboard).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  const pad = nav.locator('[data-open="true"]');
  const note = pad.getByRole("link", { name: /declined your quote for Custom piece/ });
  await expect(note).toBeVisible();
  await expect(pad.getByText("It's more than they can spend right now · I'm saving up, I'd love to ask again next month.")).toBeVisible();
  await expect(note).toHaveAttribute("href", `/commissions?tab=archived&order=${quotedId}`);
  await note.click();
  await expect(page).toHaveURL(/tab=archived/);
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText(`${client.name} cancelled: it's more than they can spend right now.`);
  await expect(drawer).toContainText("“I'm saving up, I'd love to ask again next month.”");
  await expect(page.locator(`[data-order="${quotedId}"]`)).toContainText("Cancelled");
  await page.close();
});

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/commissions");
  await expect(page.getByText("Your commission queue lives here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/sign-in?next=/commissions");
});
