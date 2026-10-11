import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * My requests (/requests), the buyer's side, end to end: a signed-in artist
 * opens it from the account menu, sees the shipping label and the postcards,
 * filters to what needs them, then sends a real request (with an add-on) from
 * an artist's commissions page and finds it on top, waiting for a reply.
 * Visitors get a sign-in note. Everything but the sent request is the sample
 * (src/lib/commissions/sample-requests.ts).
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

const postcards = (page: Page) => page.locator("article[data-request]");

test("a buyer follows their requests and finds one they just sent", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: "My requests" }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On its way.");
  await expect(page.getByRole("complementary", { name: "Priority" })).toContainText(`Ship to@${account.handle}`);
  await expect(page.getByText("These are sample requests.")).toBeVisible();

  // The quote is the buyer's move; there's no checkout yet, and the card says so.
  const quote = page.locator('[data-request="rq_headshot"]');
  await expect(quote).toContainText("Mira sent a quote");
  await expect(quote).toContainText("Pay $65 · checkout opens soon");
  await expect(quote.locator('li[aria-current="step"]')).toContainText("Quote");

  await page.getByRole("link", { name: /Your move/ }).click();
  await expect(page).toHaveURL(/show=yours/);
  await expect(postcards(page)).toHaveCount(1);

  // Send a real request with an add-on from Mira's commissions page.
  await page.goto("/mira/commissions#svc_refsheet");
  const dialog = page.getByRole("dialog", { name: "Character ref sheet" });
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-option="outfit"]').click();
  await expect(dialog.getByText("from $160", { exact: true })).toBeVisible();
  await dialog.getByRole("checkbox", { name: /Terms of Service/ }).check();
  await dialog.getByRole("button", { name: "Start request" }).click();
  await dialog.getByLabel("Describe your idea").fill("A ref sheet for Wren: front, back, her lute and the travel cloak.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent!")).toBeVisible();

  await page.goto("/requests?show=waiting");
  const sent = postcards(page).first();
  await expect(sent).toContainText("Sent from Artiflow");
  await expect(sent).toContainText("Character ref sheet");
  await expect(sent).toContainText("+ Extra outfit");
  await expect(sent).toContainText("Waiting for Mira to reply.");
});

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/requests");
  await expect(page.getByText("Your requests live here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/sign-in?next=/requests");
});
