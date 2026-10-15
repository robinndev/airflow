import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Lettering (asked for 2026-10-15): the About board's text takes gradients
 * and effects like the profile name, every effect's color can be picked (the
 * name's too), and colors go in as HEX or RGB.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const account = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!`, id: "" };

test.beforeAll(async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { handle: account.handle, display_name: account.handle },
  });
  if (error) throw error;
  account.id = data.user.id;
  const { error: plan } = await admin().from("profiles").update({ plan: "flow_plus" }).eq("id", account.id);
  if (plan) throw plan;
});

test.afterAll(async () => {
  if (account.id) await admin().auth.admin.deleteUser(account.id);
});

async function hydrated(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps"));
  }, selector);
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await hydrated(page, "main form");
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

test("board text takes gradients and effects, effect colors go in as RGB, and the name's effect has a color", async ({ page }) => {
  await signIn(page);

  // The About board: a title in a gradient, the text glowing in a color typed as RGB.
  await page.goto("/customize?tab=about");
  await hydrated(page, "main button");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const title = page.getByRole("group", { name: "Title" });
  await title.getByLabel("Title", { exact: true }).fill("About me;");
  await title.getByRole("button", { name: "Title gradient #ff7aa8 to #c04dff" }).click();

  const text = page.getByRole("group", { name: "Text" });
  await text.getByRole("radiogroup", { name: "Text effect" }).getByRole("radio", { name: "Glow" }).click();
  await text.getByRole("radiogroup", { name: "Text effect color: code" }).getByRole("radio", { name: "RGB" }).click();
  await text.getByLabel("Text effect color: red (0 to 255)").fill("255");
  await text.getByLabel("Text effect color: green (0 to 255)").fill("209");
  await text.getByLabel("Text effect color: blue (0 to 255)").fill("102");
  await expect(text.getByRole("button", { name: "Copy Text effect color RGB code" })).toBeEnabled();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved — live on your page")).toBeVisible();

  // The name: an outline in a color typed as hex (the RGB choice is remembered, so switch back).
  await page.getByRole("tab", { name: "Name & bio" }).click();
  await page.getByRole("radiogroup", { name: "Name effect" }).getByRole("radio", { name: "Outline" }).click();
  await page.getByRole("radiogroup", { name: "Name effect color: code" }).getByRole("radio", { name: "HEX" }).click();
  await page.getByLabel("Name effect color: hex code").fill("173B5B");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved — live on your page")).toBeVisible();

  // The profile shows it all.
  await page.goto(`/${account.handle}`);
  const name = page.locator('[data-profile-canvas] [data-part="name"]');
  await expect(name).toHaveClass(/name-outline/);
  await expect(name).toHaveAttribute("style", /--fx-color:\s*#173b5b/);
  await expect(name).toHaveCSS("-webkit-text-stroke-color", "rgb(23, 59, 91)");

  const block = page.locator('[data-profile-canvas] [data-part="board"] .about-board-inner [data-block="text"]');
  await expect(block.locator('[data-part="block-title"]')).toHaveClass(/name-gradient/);
  const body = block.locator("p").last();
  await expect(body).toHaveClass(/name-glow/);
  await expect(body).toHaveAttribute("style", /--fx-color:\s*#ffd166/);
  // The glow is drawn in that color (oklab of #ffd166 at 70%).
  await expect(body).toHaveCSS("text-shadow", /oklab\(0\.8[0-9]+ 0\.0[0-9]+ 0\.1[0-9]+ \/ 0\.7\)/);
});
