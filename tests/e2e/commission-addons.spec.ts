import { expect, test } from "@playwright/test";

/*
 * Licenses and add-ons on a commission (demo data, no account needed): under
 * the price, included ones come ticked and locked, licenses the artist doesn't
 * sell are struck out, and ticking extras (fixed or a percentage) updates the
 * price. The ticks carry into the request form, which sends them.
 */

test("a buyer ticks add-ons under the price and they carry into the request", async ({ page }) => {
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

  // Fixed extras: $45 + $10 + $10.
  await dialog.locator('[data-option="shading"]').click();
  await dialog.locator('[data-option="animation"]').click();
  await expect(dialog.getByRole("checkbox", { name: /Full shading/ })).toBeChecked();
  await expect(dialog.getByText("from $65", { exact: true })).toBeVisible();

  // A percentage of the "from" price: +50% of $45.
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
