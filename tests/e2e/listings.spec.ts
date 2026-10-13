import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./support/local-supabase";

/*
 * Listings, discovery and the commission order, end to end: an artist lists
 * a commission service (three packages, one slot, switches to waitlist when
 * full) and an adoptable from /studio. A buyer finds the service in search,
 * requests the Lineart package (the slot is taken, the service moves to its
 * waitlist and search follows), and sees the adoptable's ready-made sheet (no
 * fake checkout). The artist quotes from the queue; the team marks it paid
 * (checkout doesn't exist yet); the artist starts, moves it to lineart and
 * delivers, and the buyer follows each step. A declined request gives its
 * slot back; marking the adoptable adopted takes it out of search.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const artist = { handle: `e2e_a${id}`, email: `e2e+a${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Comet ${id}` };
const buyer = { handle: `e2e_b${id}`, email: `e2e+b${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Buyer ${id}` };
const serviceTitle = `Comet headshot ${id}`;
const adoptName = `Nebula${id}`;
const ids: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const account of [artist, buyer]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.name, draws: ["anthro", "feral"] },
    });
    if (error) throw error;
    ids.push(data.user.id);
  }
});

test.afterAll(async () => {
  // Their listings and requests go with the profiles (on delete cascade).
  for (const userId of ids) await admin().auth.admin.deleteUser(userId);
});

async function signIn(browser: Browser, account: typeof artist): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

const art = (r: number, g: number, b: number) =>
  sharp({ create: { width: 900, height: 700, channels: 3, background: { r, g, b } } }).png().toBuffer();

async function service() {
  const { data } = await admin().from("services").select("id, status, slots_total, slots_taken, packages, price_from_usd").eq("title", serviceTitle).single();
  return data!;
}

test("an artist lists a service with packages and slots, and an adoptable", async ({ browser }) => {
  const page = await signIn(browser, artist);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Commission sheets" })).toBeVisible();

  // Made to order.
  await page.getByRole("button", { name: "New service" }).first().click();
  const editor = page.getByRole("dialog", { name: /New commission service/ });
  await expect(editor).toBeVisible();
  await editor.locator('input[type="file"]').setInputFiles({ name: "example.png", mimeType: "image/png", buffer: await art(90, 160, 230) });
  await editor.getByLabel("Name", { exact: true }).fill(serviceTitle);
  await editor.getByLabel("Category", { exact: true }).selectOption("icons");
  await editor.getByRole("button", { name: "Cel-shaded" }).click();
  await editor.getByRole("button", { name: /Use Sketch · Lineart · Full color/ }).click();
  await editor.getByLabel("Slots", { exact: true }).fill("1");
  // The live sheet shows the ladder as buyers will.
  const preview = editor.getByRole("complementary", { name: "Preview" });
  await expect(preview.getByText("Lineart")).toBeVisible();
  await expect(editor.getByText("Uploading")).toHaveCount(0);
  await editor.getByRole("button", { name: "List it" }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("heading", { name: serviceTitle, exact: true })).toBeVisible();

  const listed = await service();
  expect(listed.status).toBe("open");
  expect(listed.slots_total).toBe(1);
  expect((listed.packages as { label: string }[]).map((p) => p.label)).toEqual(["Sketch", "Lineart", "Full color"]);
  expect(Number(listed.price_from_usd)).toBe(20);

  // Ready-made.
  await page.getByRole("button", { name: "New adoptable" }).first().click();
  const adoptEditor = page.getByRole("dialog", { name: /New adoptable/ });
  await adoptEditor.locator('input[type="file"]').setInputFiles({ name: "nebula.png", mimeType: "image/png", buffer: await art(200, 120, 220) });
  await adoptEditor.getByLabel("Name", { exact: true }).fill(adoptName);
  await adoptEditor.getByLabel("Species", { exact: true }).fill("Star cat");
  await adoptEditor.getByLabel("Price", { exact: true }).fill("30");
  await expect(adoptEditor.getByText("Uploading")).toHaveCount(0);
  await adoptEditor.getByRole("button", { name: "List it" }).click();
  await expect(adoptEditor).toBeHidden();
  await expect(page.getByRole("link", { name: adoptName, exact: true })).toBeVisible();
});

test("a buyer finds it, requests a package, and the slot is taken", async ({ browser }) => {
  const page = await signIn(browser, buyer);

  // Search by name, with filters that match.
  await page.goto(`/explore/search?q=${encodeURIComponent(serviceTitle)}&style=cel_shaded&max=40`);
  await expect(page.getByRole("heading", { name: serviceTitle, exact: true })).toBeVisible();
  // …and filters that don't.
  await page.goto(`/explore/search?q=${encodeURIComponent(serviceTitle)}&style=pixel`);
  await expect(page.getByText("Nothing matches all of that.")).toBeVisible();

  await page.goto(`/${artist.handle}/commissions`);
  await expect(page.getByRole("heading", { name: serviceTitle, exact: true })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: serviceTitle });
  await expect(async () => {
    await page.getByRole("button", { name: "Request", exact: true }).first().click();
    await expect(dialog).toBeVisible({ timeout: 1500 });
  }).toPass();
  await dialog.locator('label[data-package="lineart"]').click();
  await expect(dialog.getByText("Lineart").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Start request" }).click();
  await dialog.getByLabel("Describe your idea").fill("My star cat OC, sleepy, with a moon charm. Lineart is perfect!");
  await dialog.locator('input[name="acceptedTerms"]').check();
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent!")).toBeVisible();

  const { data: requests } = await admin().from("commission_requests").select("package, estimate_usd, status, holds_slot").eq("service_title", serviceTitle);
  expect(requests).toHaveLength(1);
  expect(requests![0]).toMatchObject({ package: { label: "Lineart" }, status: "pending", holds_slot: true });
  // One slot: it's full, so it switched to the waitlist.
  expect(await service()).toMatchObject({ slots_taken: 1, status: "waitlist" });

  // Search follows: not open now, but there with waitlists.
  await page.goto(`/explore/search?q=${encodeURIComponent(serviceTitle)}`);
  await expect(page.getByText("Nothing matches all of that.")).toBeVisible();
  await page.goto(`/explore/search?q=${encodeURIComponent(serviceTitle)}&avail=waitlist`);
  await expect(page.getByRole("heading", { name: serviceTitle, exact: true })).toBeVisible();

  // The request is on its way, from Artiflow.
  await page.goto("/requests");
  await expect(page.getByText(serviceTitle).first()).toBeVisible();

  // Ready-made: its own sheet, no request, and no button that pretends to charge.
  await page.goto(`/${artist.handle}/adoptables`);
  await expect(async () => {
    await page.getByRole("link", { name: adoptName, exact: true }).click();
    await expect(page.getByRole("dialog", { name: `${adoptName}, ready-made` })).toBeVisible({ timeout: 1500 });
  }).toPass();
  const sheet = page.getByRole("dialog", { name: `${adoptName}, ready-made` });
  await expect(sheet.getByText("No request, no quote")).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Adopt for \$30 · checkout opens soon/ })).toBeDisabled();
});

test("the whole order: quote, paid (team), start, steps, delivery; the buyer follows it", async ({ browser }) => {
  const artistPage = await signIn(browser, artist);
  const buyerPage = await signIn(browser, buyer);
  const { data: request } = await admin().from("commission_requests").select("id").eq("service_title", serviceTitle).single();
  const order = async () =>
    (await admin().from("commission_requests").select("status, quote_usd, step, delivery").eq("id", request!.id).single()).data!;

  // The artist's board shows the real order (no sample), and it can't be dragged.
  await artistPage.goto("/commissions");
  await expect(artistPage.getByText("These are sample orders")).toHaveCount(0);
  const ticket = artistPage.locator(`[data-order="${request!.id}"]`).first();
  await expect(ticket).toBeVisible();
  await expect(ticket).toHaveAttribute("draggable", "false");

  // Yes, with a quote.
  await ticket.click();
  const drawer = artistPage.getByRole("dialog");
  await drawer.getByLabel("Price").fill("40");
  await drawer.getByLabel(/A note for/).fill("Two revisions included. Sketch in 3 days.");
  await drawer.getByRole("button", { name: "Send quote" }).click();
  await expect.poll(async () => (await order()).status).toBe("quoted");
  expect(Number((await order()).quote_usd)).toBe(40);
  await expect(drawer.getByText("Quote sent: $40")).toBeVisible();

  // The buyer sees the quote, and can't pay yet.
  await buyerPage.goto("/requests");
  await expect(buyerPage.getByText("sent a quote:").first()).toBeVisible();
  await expect(buyerPage.getByText("Pay $40 · checkout opens soon").first()).toBeVisible();

  // Checkout doesn't exist yet: the team marks it paid (npm run orders -- paid <id>).
  await admin().from("commission_requests").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", request!.id);

  // Up next → on the easel → lineart → delivered.
  await artistPage.goto("/commissions");
  await artistPage.locator(`[data-order="${request!.id}"]`).first().click();
  await drawer.getByRole("button", { name: "Start sketching" }).click();
  await expect.poll(async () => (await order()).status).toBe("in_progress");
  await expect(drawer.getByRole("button", { name: "Set progress to Lineart" })).toBeVisible();
  await drawer.getByRole("button", { name: "Set progress to Lineart" }).click();
  await expect.poll(async () => (await order()).step).toBe("lineart");

  await buyerPage.goto("/requests");
  await expect(buyerPage.getByLabel(/Progress: Lineart/).first()).toBeVisible();

  await drawer.getByRole("button", { name: "Deliver", exact: true }).click();
  await drawer.locator('input[type="file"]').setInputFiles({ name: "final.png", mimeType: "image/png", buffer: await art(240, 200, 120) });
  await expect(drawer.getByText("Uploading")).toHaveCount(0);
  await drawer.getByLabel(/A note for/).fill("Here she is! Thank you 💙");
  await drawer.getByRole("button", { name: "Deliver", exact: true }).click();
  await expect.poll(async () => (await order()).status).toBe("delivered");
  expect(((await order()).delivery as { images: unknown[] }).images).toHaveLength(1);

  await buyerPage.goto("/requests");
  await expect(buyerPage.getByText(/Arrived/).first()).toBeVisible();
});

test("declining gives the slot back; adopted leaves search", async ({ browser }) => {
  const artistPage = await signIn(browser, artist);
  const buyerPage = await signIn(browser, buyer);

  // Delivered work keeps its slot; the artist frees it by hand to take the next one.
  expect(await service()).toMatchObject({ slots_taken: 1, status: "waitlist" });
  await artistPage.goto("/studio");
  await artistPage.getByRole("button", { name: "Free a slot" }).first().click();
  await expect.poll(async () => (await service()).status).toBe("open");

  // A second request, declined with a kind word.
  await buyerPage.goto(`/${artist.handle}/commissions`);
  const dialog = buyerPage.getByRole("dialog", { name: serviceTitle });
  await expect(async () => {
    await buyerPage.getByRole("button", { name: "Request", exact: true }).first().click();
    await expect(dialog).toBeVisible({ timeout: 1500 });
  }).toPass();
  await dialog.getByRole("button", { name: "Start request" }).click();
  await dialog.getByLabel("Describe your idea").fill("Another one please: my star cat, now with wings and a scarf.");
  await dialog.locator('input[name="acceptedTerms"]').check();
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent!")).toBeVisible();
  expect((await service()).slots_taken).toBe(1);

  const { data: second } = await admin()
    .from("commission_requests")
    .select("id")
    .eq("service_title", serviceTitle)
    .eq("status", "pending")
    .single();
  await artistPage.goto("/commissions");
  await artistPage.locator(`[data-order="${second!.id}"]`).first().click();
  const drawer = artistPage.getByRole("dialog");
  await drawer.getByRole("button", { name: "Decline", exact: true }).click();
  await drawer.getByPlaceholder(/A kind word/).fill("My queue is full this month, sorry!");
  await drawer.getByRole("button", { name: "Decline", exact: true }).click();
  await expect.poll(async () => (await service()).slots_taken).toBe(0);
  expect((await service()).status).toBe("open");

  await buyerPage.goto("/requests");
  await expect(buyerPage.getByText("My queue is full this month, sorry!").first()).toBeVisible();

  // Marked adopted from the studio: gone from search's default (available) view.
  await artistPage.goto("/studio");
  await artistPage.getByRole("radiogroup", { name: `${adoptName} status` }).getByText("Adopted").click();
  await expect(artistPage.getByText(`${adoptName} is adopted`)).toBeVisible();
  await artistPage.goto(`/explore/search?type=adoptables&q=${adoptName}`);
  await expect(artistPage.getByText("Nothing matches all of that.")).toBeVisible();
  await artistPage.goto(`/explore/search?type=adoptables&q=${adoptName}&avail=all`);
  await expect(artistPage.getByRole("link", { name: adoptName, exact: true })).toBeVisible();
});
