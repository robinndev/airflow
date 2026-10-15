import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * The supply shop, end to end: visitors browse the aisles and are asked to
 * sign in; a free item goes on in one click and shows on the profile; paid
 * items wait on checkout; Flow+ takes one paid item a month (once); and
 * nobody can write what they own themselves.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Account = { handle: string; name: string; email: string; password: string; id: string };

const run = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const account = (who: string, name: string): Account => ({
  handle: `e2e_${who}_${run}`,
  name,
  email: `e2e+${who}${run}@artiflow.test`,
  password: `Teal-brush-${run}!`,
  id: "",
});
const free = account("shp", "Pia Lumen");
const member = account("shpp", "Ori Vale");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const person of [free, member]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.name },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
  await admin().from("profiles").update({ plan: "flow_plus" }).eq("id", member.id);
});

test.afterAll(async () => {
  for (const person of [free, member]) if (person.id) await admin().auth.admin.deleteUser(person.id);
});

const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close();
});

async function signedIn(browser: Browser, person: Account) {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(person.handle);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

const picked = (page: import("@playwright/test").Page) => page.locator("section[aria-labelledby=picked-heading]");

async function openShop(page: import("@playwright/test").Page) {
  await page.goto("/shop");
  await page.waitForFunction(() => {
    const product = document.querySelector('button[aria-pressed]');
    return !!product && Object.keys(product).some((key) => key.startsWith("__reactProps"));
  });
}

test("visitors browse every aisle and are asked to sign in", async ({ page }) => {
  await openShop(page);
  for (const aisle of ["Frames", "Profile effects", "Animated names", "Animated covers", "Sticker packs", "Pins"]) {
    await expect(page.getByRole("heading", { name: aisle })).toBeVisible();
  }
  await page.getByRole("button", { name: /^Fireflies,/ }).click();
  await expect(picked(page).getByRole("heading", { name: "Fireflies" })).toBeVisible();
  await expect(picked(page).getByRole("link", { name: "Sign in to collect" })).toHaveAttribute("href", "/sign-in?next=/shop");
});

test("a free item goes on in one click and shows on the profile", async ({ browser }) => {
  const page = await signedIn(browser, free);
  await openShop(page);
  await page.getByRole("button", { name: /^Petal Drift,/ }).click();
  await picked(page).getByRole("button", { name: "Take it free & wear it" }).click();
  await expect(picked(page).getByText("You're wearing this")).toBeVisible();

  await page.getByRole("button", { name: /^Night Owl,/ }).click();
  await picked(page).getByRole("button", { name: "Take it free & wear it" }).click();
  await expect(picked(page).getByText("You're wearing this")).toBeVisible();

  await page.goto(`/${free.handle}`);
  await expect(page.locator('[data-part="profile-effect"]')).toHaveCount(1);
  await expect(page.locator('[data-part="pin"]').getByText("Pin: Night Owl")).toBeAttached();

  // Paid items wait on checkout, and a free account has no monthly pick.
  await openShop(page);
  await page.getByRole("button", { name: /^Starfall,/ }).click();
  await expect(picked(page).getByRole("button", { name: /checkout opens soon/ })).toBeDisabled();
  await expect(picked(page).getByRole("button", { name: "Use your monthly pick" })).toHaveCount(0);
});

test("Flow+ takes one paid item a month, once", async ({ browser }) => {
  const page = await signedIn(browser, member);
  await openShop(page);
  await expect(page.getByText("Your monthly pick is waiting")).toBeVisible();
  await page.getByRole("button", { name: /^Night Sky,/ }).click();
  await picked(page).getByRole("button", { name: "Use your monthly pick" }).click();
  await expect(picked(page).getByText("You're wearing this")).toBeVisible();
  await expect(page.getByText("This month's pick: Night Sky")).toBeVisible();

  const { data } = await admin().from("owned_items").select("kind, item_id, source, claimed_month").eq("user_id", member.id);
  expect(data).toEqual([expect.objectContaining({ kind: "cover", item_id: "twinkle", source: "monthly" })]);

  // The next paid item waits for next month (and the database holds the line too).
  await page.getByRole("button", { name: /^Holo Sheen,/ }).click();
  await expect(picked(page).getByRole("button", { name: "Use your monthly pick" })).toHaveCount(0);
  const { error } = await admin()
    .from("owned_items")
    .insert({ user_id: member.id, kind: "effect", item_id: "starfall", source: "monthly", claimed_month: data![0].claimed_month });
  expect(error?.code).toBe("23505");

  await page.goto(`/${member.handle}`);
  await expect(page.locator('[data-part="cover-effect"]')).toHaveCount(1);
});

test("nobody writes what they own themselves", async () => {
  const { apiUrl, publishableKey } = localSupabase();
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.signInWithPassword({ email: free.email, password: free.password });
  const { error } = await client.from("owned_items").insert({ user_id: free.id, kind: "effect", item_id: "starfall", source: "purchase" });
  expect(error).not.toBeNull();
  const { data } = await client.from("owned_items").select("user_id").eq("user_id", member.id);
  expect(data ?? []).toHaveLength(0);
});
