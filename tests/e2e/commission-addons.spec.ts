import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Licenses and add-ons on a commission (a demo artist's service): under the
 * price, included ones come ticked and locked, licenses the artist doesn't
 * sell are struck out, and ticking extras (fixed or a percentage) updates the
 * price. The ticks carry into the request form, which sends them (signed in:
 * every request is stored).
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

test("a buyer ticks add-ons under the price and they carry into the request", async ({ page }) => {
  await signIn(page);
  await page.goto("/mira/commissions#svc_headshot");
  const dialog = page.getByRole("dialog", { name: "Headshot & icon" });
  await expect(dialog).toBeVisible();

  // Included: ticked and locked. Not offered: can't be ticked.
  const personal = dialog.getByRole("checkbox", { name: /^Personal/ });
  await expect(personal).toBeChecked();
  await expect(personal).toBeDisabled();
  await expect(dialog.locator('[data-option="license:personal"]')).toContainText("Included");
  await expect(dialog.getByRole("checkbox", { name: /Merchandising/ })).toBeDisabled();
  await expect(dialog.locator('[data-option="license:commercialMerch"]')).toContainText("Not offered");

  // Packages: the cheapest is picked first; the full render costs $45.
  await expect(dialog.locator('[data-package="sketch"] input')).toBeChecked();
  await dialog.locator('[data-package="render"]').click();
  await expect(dialog.locator('[data-package="render"] input')).toBeChecked();

  // Fixed extras: $45 + $10 + $10.
  await dialog.locator('[data-option="shading"]').click();
  await dialog.locator('[data-option="animation"]').click();
  await expect(dialog.getByRole("checkbox", { name: /Full shading/ })).toBeChecked();
  await expect(dialog.getByText("from $65", { exact: true })).toBeVisible();

  // A percentage of the package's price: +50% of $45.
  await dialog.locator('[data-option="license:commercialContent"]').click();
  await expect(dialog.getByText("from $87.50", { exact: true })).toBeVisible();

  // Unticking takes it off again.
  await dialog.locator('[data-option="license:commercialContent"]').click();
  await expect(dialog.getByText("from $65", { exact: true })).toBeVisible();

  await dialog.getByRole("checkbox", { name: /Terms of Service/ }).check();
  await dialog.getByRole("button", { name: "Start request" }).click();

  // Same ticks in the form, and in the estimate.
  await expect(dialog.getByRole("checkbox", { name: /Full shading/ })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /Animated blink/ })).toBeChecked();
  await expect(dialog.getByText(/Estimated from \$65 incl\. \$20 in extras/)).toBeVisible();

  await dialog.getByLabel("Describe your idea").fill("My OC Juniper, sleepy pastel headshot with a flower clip on the left.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent!")).toBeVisible();

  // Stored with the package and the extras, priced as they were.
  const { data } = await admin().from("commission_requests").select("package, addons, estimate_usd").eq("buyer_id", userId).single();
  expect(data).toMatchObject({ package: { label: "Full render" } });
  expect(Number(data!.estimate_usd)).toBe(65);
  expect((data!.addons as { label: string }[]).map((a) => a.label)).toEqual(["Full shading", "Animated blink"]);
});

test("a service without add-ons still lists its licenses, all included", async ({ page }) => {
  await page.goto("/kai/commissions#svc_adopt");
  const dialog = page.getByRole("dialog", { name: "Custom adoptable" });
  await expect(dialog).toBeVisible();
  for (const name of [/^Personal/, /Content/, /Merchandising/]) {
    await expect(dialog.getByRole("checkbox", { name })).toBeChecked();
  }
  await expect(dialog.getByText("Add-ons", { exact: true })).toHaveCount(0);
});
