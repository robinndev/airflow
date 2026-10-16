import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import Stripe from "stripe";
import { localSupabase } from "./support/local-supabase";

/*
 * Payments through Stripe, for real (test mode): an artist without payouts
 * can't be paid, and their studio offers to set them up (the founding
 * artists' 0% banner beside it); "Set up payouts" opens Stripe's own form.
 * With payouts on, the buyer pays a quote on Stripe's Checkout page, comes
 * back, and the order is paid (Stripe's fee recorded); the artist refunds it
 * before delivering and the buyer is told. A buyer adopts a character the
 * same way, and the team refunds that buyer from /admin/payments
 * (money.refund). Needs STRIPE_SECRET_KEY (sk_test_…) in .env.local; skipped
 * without it. Stripe's onboarding form is filled in by people: the test
 * switches the artist's payouts on in the database.
 */

const key = (() => {
  try {
    return readFileSync(".env.local", "utf8").match(/^STRIPE_SECRET_KEY=(sk_test_\S+)/m)?.[1];
  } catch {
    return undefined;
  }
})();

test.skip(!key, "Payments need STRIPE_SECRET_KEY (a test key) in .env.local.");
// Stripe's own pages take their time.
test.describe.configure({ mode: "serial", timeout: 150_000 });

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const artist = { handle: `e2e_p${id}`, email: `e2e+p${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Pixel ${id}` };
const buyer = { handle: `e2e_q${id}`, email: `e2e+q${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Quill ${id}` };
const boss = { handle: `e2e_r${id}`, email: `e2e+r${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Rook ${id}` };
const ids: string[] = [];
let orderId = "";
let adoptableId = "";
const adoptName = `Nimbus${id}`;

test.beforeAll(async () => {
  for (const account of [artist, buyer, boss]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.name, draws: ["humans"] },
    });
    if (error) throw error;
    ids.push(data.user.id);
  }
  const { error } = await admin().rpc("set_artist_access", { handle: artist.handle, artist: true });
  if (error) throw error;
  // A team member who holds refunds (npm run team -- grant @handle money.refund).
  const { error: teamError } = await admin().from("team_members").insert({ user_id: ids[2], role: "admin", permissions: ["money.refund"] });
  if (teamError) throw teamError;

  // A custom piece the artist quoted $25 for.
  const { data: request, error: requestError } = await admin()
    .from("commission_requests")
    .insert({ buyer_id: ids[1], artist_id: ids[0], service_title: `Pixel portrait ${id}`, description: "A small pixel portrait of my character, please." })
    .select("id")
    .single();
  if (requestError) throw requestError;
  orderId = request.id;
  await admin()
    .from("commission_requests")
    .update({ status: "quoted", quote_usd: 25, quoted_at: new Date().toISOString(), quote_expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString() })
    .eq("id", orderId);

  const { data: adoptable, error: adoptError } = await admin()
    .from("adoptables")
    .insert({ owner_id: ids[0], name: adoptName, species: "Cloud cat", price_usd: 30, images: [{ path: `${ids[0]}/listings/e2e.webp`, width: 600, height: 600 }] })
    .select("id")
    .single();
  if (adoptError) throw adoptError;
  adoptableId = adoptable.id;
});

test.afterAll(async () => {
  for (const userId of ids) await admin().auth.admin.deleteUser(userId);
});

async function signIn(browser: Browser, account: typeof artist): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((k) => k.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

/** Stripe's hosted Checkout page, paid with Stripe's test Visa. */
async function payOnStripe(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  await page.locator("#cardNumber").waitFor({ timeout: 30_000 });
  // The buyer's email comes filled in (we pass it); fill it only if Stripe asks.
  const email = page.locator("input#email");
  if ((await email.count()) > 0 && (await email.isEditable())) await email.fill(buyer.email);
  // Stripe may offer the buyer's own currency too (Adaptive Pricing): pay in dollars here.
  const dollars = page.getByText(/^\$\d+\.\d{2}$/).first();
  if (await dollars.isVisible().catch(() => false)) await dollars.click();
  const cardTab = page.getByRole("button", { name: /^Card$/ });
  if (await cardTab.isVisible().catch(() => false)) await cardTab.click();
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill(buyer.name);
  const country = page.locator("#billingCountry");
  if (await country.isVisible().catch(() => false)) await country.selectOption("US");
  const zip = page.locator("#billingPostalCode");
  await zip.waitFor({ timeout: 5_000 }).catch(() => undefined);
  if (await zip.isVisible().catch(() => false)) await zip.fill("94103");
  // Stripe's form settles after the last field; a click it ignores gets one more try.
  const pay = page.locator('button[type="submit"]').first();
  for (let attempt = 0; attempt < 2; attempt++) {
    await pay.click();
    const left = await page
      .waitForURL((url) => !url.hostname.endsWith("stripe.com"), { timeout: 45_000 })
      .then(() => true)
      .catch(() => false);
    if (left) return;
  }
}

test("no payouts yet: the buyer can't pay, the artist is asked to set them up", async ({ browser }) => {
  const buyerPage = await signIn(browser, buyer);
  await buyerPage.goto("/requests");
  await expect(buyerPage.getByText(`Pay $25 once Pixel sets up payouts`).first()).toBeVisible();

  const page = await signIn(browser, artist);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Connect Stripe to get paid." })).toBeVisible();
  // Only Artiflow's own fee is off: Stripe's is said plainly.
  await expect(page.getByRole("heading", { name: "No platform fee for your first 12 months." })).toBeVisible();
  await expect(page.getByText("Stripe's processing fee: still applies")).toBeVisible();

  await page.getByLabel("Country you live in").selectOption("US");
  await page.getByRole("button", { name: "Set up payouts with Stripe" }).click();
  await page.waitForURL(/connect\.stripe\.com|stripe\.com/, { timeout: 30_000 });

  const { data } = await admin().from("payout_accounts").select("account_id, country, status").eq("user_id", ids[0]).single();
  expect(data?.account_id).toMatch(/^acct_/);
  expect(data?.country).toBe("US");
  expect(data?.status).toBe("incomplete");
});

test("the buyer pays the quote on Stripe; the order is paid; the artist refunds it", async ({ browser }) => {
  // Stripe's form is for people: switch the test account's payouts on here.
  await admin().from("payout_accounts").update({ status: "active", checked_at: new Date().toISOString() }).eq("user_id", ids[0]);

  const buyerPage = await signIn(browser, buyer);
  await buyerPage.goto("/requests");
  await buyerPage.getByRole("button", { name: /^Pay \$25\.00/ }).first().click();
  await payOnStripe(buyerPage);
  await buyerPage.waitForURL(/\/requests/, { timeout: 60_000 });
  await expect(buyerPage.getByText("Paid! The artist has been told.")).toBeVisible();

  const order = async () => (await admin().from("commission_requests").select("status, paid_at, checkout_until").eq("id", orderId).single()).data!;
  await expect.poll(async () => (await order()).status).toBe("paid");
  expect((await order()).checkout_until).toBeNull();
  const { data: payment } = await admin().from("payments").select("*").eq("request_id", orderId).eq("status", "paid").single();
  expect(payment.amount_cents).toBe(2500);
  expect(payment.currency).toBe("usd");
  expect(payment.platform_fee_cents).toBe(0);

  // It's real on Stripe: a paid Checkout on the artist's own account.
  const stripe = new Stripe(key!);
  const session = await stripe.checkout.sessions.retrieve(payment.checkout_id, {}, { stripeAccount: payment.account_id });
  expect(session.payment_status).toBe("paid");

  // The artist sees what Stripe took, and refunds before delivering.
  const page = await signIn(browser, artist);
  await page.goto(`/commissions?order=${orderId}`);
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Artiflow fee (0%, founding artists)")).toBeVisible();
  await expect(drawer.getByText("Stripe's processing fee")).toBeVisible();
  // Stripe's fee trails the payment by a moment; the queue fills it in (or the webhook does).
  const fee = async () => (await admin().from("payments").select("processor_fee_cents").eq("id", payment.id).single()).data!.processor_fee_cents;
  await expect.poll(async () => {
    await page.reload();
    return fee();
  }, { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(drawer.getByText(/^−\$\d+\.\d{2}$/)).toBeVisible();
  await drawer.getByRole("button", { name: `Refund ${buyer.name}` }).click();
  await drawer.getByPlaceholder(/A word for/).fill("I can't fit it in this month, sorry!");
  await drawer.getByRole("button", { name: /^Refund \$25/ }).click();
  await expect.poll(async () => (await order()).status).toBe("refunded");
  const refunds = await stripe.refunds.list({ payment_intent: payment.payment_intent_id }, { stripeAccount: payment.account_id });
  expect(refunds.data).toHaveLength(1);

  // The buyer's postcard says so, with the artist's note.
  await buyerPage.goto("/requests");
  await expect(buyerPage.getByText(/Pixel refunded \$25/).first()).toBeVisible();
  await expect(buyerPage.getByText("I can't fit it in this month, sorry!").first()).toBeVisible();
});

test("a buyer adopts a character through Stripe; it's sold and the artist is told", async ({ browser }) => {
  const buyerPage = await signIn(browser, buyer);
  await buyerPage.goto(`/${artist.handle}/adoptables#${adoptableId}`);
  const sheet = buyerPage.getByRole("dialog", { name: `${adoptName}, ready-made` });
  await expect(async () => {
    if (!(await sheet.isVisible())) await buyerPage.getByRole("link", { name: adoptName, exact: true }).click();
    await expect(sheet).toBeVisible({ timeout: 1500 });
  }).toPass();
  await sheet.getByRole("button", { name: /^Adopt for \$30\.00/ }).click();
  await payOnStripe(buyerPage);
  await buyerPage.waitForURL(new RegExp(`/${artist.handle}/adoptables`), { timeout: 60_000 });
  await expect(buyerPage.getByText("It's yours!")).toBeVisible();

  const adoptable = async () => (await admin().from("adoptables").select("status, checkout_until").eq("id", adoptableId).single()).data!;
  await expect.poll(async () => (await adoptable()).status).toBe("sold");
  const { data: notice } = await admin().from("notifications").select("kind, actor_id, data").eq("recipient_id", ids[0]).eq("kind", "adoption").single();
  expect(notice?.actor_id).toBe(ids[1]);
  expect((notice?.data as { name?: string })?.name).toBe(adoptName);
});

test("the team refunds a buyer from the back office (money.refund)", async ({ browser }) => {
  const { data: payment } = await admin().from("payments").select("id, payment_intent_id, account_id").eq("adoptable_id", adoptableId).eq("status", "paid").single();
  const page = await signIn(browser, boss);
  await page.goto(`/admin/payments?q=${buyer.handle}`);
  const row = page.locator(`[data-payment="${payment!.id}"]`);
  await expect(row.getByText(adoptName)).toBeVisible();
  await row.getByRole("button", { name: "Refund buyer" }).click();
  await row.getByLabel("Why (the buyer reads it)").fill("The artist stopped answering, so we're giving it back.");
  await row.getByRole("button", { name: /^Refund \$30\.00/ }).click();

  // From the artist's Stripe balance: done, or waiting on it.
  const status = async () => (await admin().from("payments").select("status, refund_source, refund_requested_by").eq("id", payment!.id).single()).data!;
  await expect.poll(async () => (await status()).status).toMatch(/^(refunded|refund_pending)$/);
  expect((await status()).refund_source).toBe("team");
  expect((await status()).refund_requested_by).toBe(ids[2]);
  const refunds = await new Stripe(key!).refunds.list({ payment_intent: payment!.payment_intent_id! }, { stripeAccount: payment!.account_id });
  expect(refunds.data).toHaveLength(1);

  // Without the permission, the button isn't there.
  await admin().from("team_members").update({ permissions: [] }).eq("user_id", ids[2]);
  await page.reload();
  await expect(page.getByText("Refunding buyers takes the money.refund permission.")).toBeVisible();
});
