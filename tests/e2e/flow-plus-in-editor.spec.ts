import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Flow+ in the customizer, for a free account:
 * - a bar says what Flow+ adds on each tab and leads to /plans#flow-plus;
 * - paid options carry a FLOW+ tag and still preview (try before you buy);
 * - picking one names it in the bar, and saving it is refused;
 * - a Flow+ account gets no bar and no tags.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// The second test moves the account to Flow+.
test.describe.configure({ mode: "serial" });

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const account = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
let userId = "";

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
    const el = document.querySelector("main form");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(account.handle);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

test("a free account sees what Flow+ adds, tries it on, and can't save it", async ({ page }) => {
  await signIn(page);
  await page.goto("/customize?tab=theme");

  const bar = page.getByRole("region", { name: "Flow+" });
  await expect(bar).toContainText("You're on Free.");
  await expect(bar).toContainText("your own colors");
  await expect(bar.getByRole("link", { name: /Get Flow\+/ })).toHaveAttribute("href", "/plans#flow-plus");

  // Paid palettes are tagged, free ones aren't.
  await expect(page.getByRole("button", { name: /Forest/ })).toContainText("FLOW+");
  await expect(page.getByRole("button", { name: /Sakura/ })).not.toContainText("FLOW+");

  // The bar follows the tab.
  await page.getByRole("tab", { name: "Name & bio" }).click();
  await expect(bar).toContainText("gradient names");
  const pixel = page.getByRole("radio", { name: /Pixel/ });
  await expect(pixel).toContainText("FLOW+");

  // Trying one on names it; saving is refused, so nothing reaches the profile.
  await pixel.click();
  await expect(bar).toContainText("You're previewing that name font");
  const answered = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/customize");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await answered;
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  const { data } = await admin().from("profiles").select("customization").eq("id", userId).single();
  expect(data?.customization?.name?.font).not.toBe("pixel");
});

test("a Flow+ account gets no bar and no tags", async ({ page }) => {
  const { error } = await admin().from("profiles").update({ plan: "flow_plus" }).eq("id", userId);
  if (error) throw error;
  await signIn(page);
  await page.goto("/customize?tab=theme");
  await expect(page.getByRole("button", { name: /Forest/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Flow+" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Forest/ })).not.toContainText("FLOW+");
});
