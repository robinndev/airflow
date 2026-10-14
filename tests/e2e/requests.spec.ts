import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * My requests (/requests), the buyer's side, end to end and all real: a
 * signed-in artist with no requests gets an empty postbox pointing at search;
 * visitors who try to request are sent to sign in first; then they send a
 * request (with an add-on) to a demo artist, find it as a postcard waiting
 * for a reply (stored, though demo artists never answer), and take it back.
 * Visitors get a sign-in note.
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

test("a buyer sends a request and follows it; nothing here is a sample", async ({ page }) => {
  // Visitors are asked to sign in before they fill anything in.
  await page.goto("/mira/commissions#svc_refsheet");
  const dialog = page.getByRole("dialog", { name: "Character ref sheet" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Sign in to request" })).toHaveAttribute(
    "href",
    `/sign-in?next=${encodeURIComponent("/mira/commissions#svc_refsheet")}`,
  );

  await signIn(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: "My requests" }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On its way.");
  await expect(page.getByRole("complementary", { name: "Priority" })).toContainText(`Ship to@${account.handle}`);
  await expect(postcards(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Find an open studio" })).toHaveAttribute("href", "/explore/search");

  // Send a request with an add-on from Mira's commissions page.
  await page.goto("/mira/commissions#svc_refsheet");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-option="outfit"]').click();
  await expect(dialog.getByText("from $160", { exact: true })).toBeVisible();
  await dialog.getByRole("checkbox", { name: /Terms of Service/ }).check();
  await dialog.getByRole("button", { name: "Start request" }).click();
  await dialog.getByLabel("Describe your idea").fill("A ref sheet for Wren: front, back, her lute and the travel cloak.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByText("Request sent!")).toBeVisible();

  // Stored for real, under the demo artist's handle.
  const { data: rows } = await admin().from("commission_requests").select("id, demo_artist, status, addons").eq("buyer_id", userId);
  expect(rows).toHaveLength(1);
  expect(rows![0]).toMatchObject({ demo_artist: "mira", status: "pending", addons: [expect.objectContaining({ label: "Extra outfit" })] });

  await page.goto("/requests?show=waiting");
  const sent = postcards(page).first();
  await expect(postcards(page)).toHaveCount(1);
  await expect(sent).toContainText("Sent from Artiflow");
  await expect(sent).toContainText("Character ref sheet");
  await expect(sent).toContainText("+ Extra outfit");
  await expect(sent).toContainText("Waiting for Mira to reply.");

  // Taken back, with a reason (the artist sees it): "something else" needs a few words.
  await sent.getByRole("button", { name: "Take it back" }).click();
  const why = page.getByRole("dialog", { name: "Why are you cancelling this commission request?" });
  await expect(why).toBeVisible();
  await expect(why.getByRole("button", { name: "Withdraw request" })).toBeDisabled();
  await why.getByText("Something else").click();
  await expect(why.getByLabel("Tell Mira why")).toBeVisible();
  await why.getByLabel("Tell Mira why").fill("Wren's design changed, I'll send a new request.");
  await why.getByRole("button", { name: "Withdraw request" }).click();
  await expect(why).toBeHidden();
  await expect
    .poll(async () => (await admin().from("commission_requests").select("status, cancel_reason, cancel_note").eq("id", rows![0].id).single()).data)
    .toEqual({ status: "cancelled", cancel_reason: "other", cancel_note: "Wren's design changed, I'll send a new request." });
  await page.goto("/requests?show=closed");
  await expect(postcards(page).first()).toContainText("Nothing was charged.");
  await expect(postcards(page).first()).toContainText("You told Mira: Something else · “Wren's design changed, I'll send a new request.”");
});

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/requests");
  await expect(page.getByText("Your requests live here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/sign-in?next=/requests");
});
