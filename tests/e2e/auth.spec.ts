import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";
import { latestEmailTo, verifyLink } from "./support/mailpit";

/*
 * Email + password accounts, end to end: sign up, confirm the email from the
 * real confirmation message, sign out, sign back in. Each run uses a fresh
 * account and deletes it afterwards.
 */

const run = Date.now().toString(36);
const account = {
  handle: `e2e_${run}`,
  email: `e2e+${run}@artiflow.test`,
  password: `Teal-brush-${run}!`,
};

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

test.afterAll(async () => {
  const supabase = admin();
  const { data } = await supabase.from("profiles").select("id").eq("handle", account.handle).maybeSingle();
  if (data?.id) await supabase.auth.admin.deleteUser(data.id);
});

async function expectSignedInAs(page: Page, handle: string) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.locator("#account-menu").getByText(`@${handle}`, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
}

async function signIn(page: Page, login: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email or handle").fill(login);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
}

test("creates an account with email + password, confirms it and signs back in", async ({ page }) => {
  await test.step("sign up", async () => {
    await page.goto("/join");
    await page.getByLabel("Your handle").fill(account.handle);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByText("I agree to Artiflow").click();
    await page.getByRole("button", { name: "Open my studio" }).click();

    const welcome = page.getByRole("status").filter({ hasText: "Account created" });
    await expect(welcome).toContainText(`@${account.handle}`);
    await expect(welcome).toContainText(account.email);
  });

  await test.step("can't sign in before confirming the email", async () => {
    await signIn(page, account.email, account.password);
    await expect(page.getByText("Confirm your email first")).toBeVisible();
  });

  await test.step("confirm from the email link → lands on the new page, signed in", async () => {
    const email = await latestEmailTo(account.email);
    await page.goto(verifyLink(email));
    await expect(page).toHaveURL(new RegExp(`/${account.handle}$`));
    await expectSignedInAs(page, account.handle);
  });

  await test.step("sign out", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  });

  await test.step("a wrong password is refused", async () => {
    await signIn(page, account.email, `${account.password}-nope`);
    await expect(page.getByText("That email or handle and password don't match")).toBeVisible();
  });

  await test.step("sign in with email + password", async () => {
    await signIn(page, account.email, account.password);
    await expect(page).toHaveURL("/");
    await expectSignedInAs(page, account.handle);
  });

  await test.step("sign in with the handle works too", async () => {
    await page.context().clearCookies();
    await signIn(page, `@${account.handle}`, account.password);
    await expect(page).toHaveURL("/");
    await expectSignedInAs(page, account.handle);
  });
});
