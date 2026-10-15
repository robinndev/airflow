import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * The back office (/admin): only admins on `team_members` get in, everyone
 * else gets the site's 404 (visitors: sign in). Signing in marks the account
 * active for the day. The dashboard counts a commission the team marked
 * paid, and the receipt's "what if" fee changes what we keep.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const boss = { handle: `e2e_t${id}`, email: `e2e+t${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Ledger ${id}` };
const artist = { handle: `e2e_a${id}`, email: `e2e+a${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Comet ${id}` };
const buyer = { handle: `e2e_b${id}`, email: `e2e+b${id}@artiflow.test`, password: `Teal-brush-${id}!`, name: `Buyer ${id}` };
const accounts = [boss, artist, buyer];
const ids: Record<string, string> = {};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const account of accounts) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.name, draws: ["anthro"] },
    });
    if (error) throw error;
    ids[account.handle] = data.user.id;
  }
  const { error } = await admin().from("team_members").insert({ user_id: ids[boss.handle], role: "admin" });
  if (error) throw error;
  await admin().rpc("set_artist_access", { handle: artist.handle, artist: true });

  // A $9,000 commission (enough to top the chart whatever else is local), quoted and marked paid by the team.
  const { data: service, error: serviceError } = await admin()
    .from("services")
    .insert({
      owner_id: ids[artist.handle],
      title: `Ledger headshot ${id}`,
      category: "icons",
      packages: [{ id: "flat", label: "Flat color", priceUsd: 9000, includes: [] }],
      turnaround_min_days: 3,
      turnaround_max_days: 7,
    })
    .select("id")
    .single();
  if (serviceError) throw serviceError;
  const { data: order, error: orderError } = await admin()
    .from("commission_requests")
    .insert({
      buyer_id: ids[buyer.handle],
      artist_id: ids[artist.handle],
      service_id: service.id,
      service_title: `Ledger headshot ${id}`,
      description: "A headshot of my comet fox, smiling, flat colors please.",
      estimate_usd: 9000,
    })
    .select("id")
    .single();
  if (orderError) throw orderError;
  const quoted = await admin()
    .from("commission_requests")
    .update({ status: "quoted", quote_usd: 9000, quoted_at: new Date().toISOString(), quote_expires_at: new Date(Date.now() + 86_400_000).toISOString() })
    .eq("id", order.id);
  if (quoted.error) throw quoted.error;
  const paid = await admin().from("commission_requests").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
  if (paid.error) throw paid.error;
});

test.afterAll(async () => {
  for (const userId of Object.values(ids)) await admin().auth.admin.deleteUser(userId);
});

async function signIn(browser: Browser, account: typeof boss): Promise<Page> {
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

test("visitors are sent to sign in, and other accounts get a 404", async ({ page, browser }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin/);

  const someone = await signIn(browser, buyer);
  await someone.goto("/admin");
  await expect(someone.getByText("This page could not be found")).toBeVisible();
  await expect(someone.getByRole("heading", { name: /How we.re doing/ })).toHaveCount(0);
  // No way in from the account menu either.
  await someone.goto("/settings");
  await someone.getByRole("button", { name: "Account menu" }).click();
  await expect(someone.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(someone.getByRole("link", { name: /Back office/ })).toHaveCount(0);
});

test("signing in marks the account active today", async ({ browser }) => {
  await signIn(browser, buyer);
  const today = new Date().toISOString().slice(0, 10);
  await expect
    .poll(async () => {
      const { data } = await admin().from("daily_activity").select("day").eq("user_id", ids[buyer.handle]).eq("day", today);
      return data?.length ?? 0;
    })
    .toBe(1);
});

test("an admin reads the back office and tries another fee", async ({ browser }) => {
  const page = await signIn(browser, boss);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("link", { name: /Back office/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /How we.re doing/ })).toBeVisible();

  // Count only what this test made: the artist and the buyer (the admin is on the team).
  const receipt = page.getByRole("complementary", { name: "What we kept" });
  await expect(receipt).toBeVisible();
  await expect(page.getByRole("link", { name: /Count the team/ })).toBeVisible();
  await expect(receipt.getByText(/^5% of \$\S+ · \d+ orders? paid/)).toBeVisible();

  // The paid commission shows up among the top artists.
  await expect(page.getByRole("link", { name: new RegExp(`Comet ${id}`) })).toBeVisible();

  // Try a 10% fee: the commission line says so, and the URL keeps it.
  await receipt.getByRole("link", { name: /^10%/ }).click();
  await expect(page).toHaveURL(/fee=10/);
  await expect(receipt.getByText(/Trying a 10% fee/)).toBeVisible();
  await expect(receipt.getByText(/^10% of \$\S+ · \d+ orders? paid/)).toBeVisible();

  // The period is in the URL too.
  await page.getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "page");
});

test("the dashboard is the secret key's alone", async () => {
  const { apiUrl, publishableKey } = localSupabase();
  const anon = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
  const { error } = await anon.rpc("admin_dashboard", {
    p_from: "2026-10-01",
    p_to: "2026-10-15",
    p_series_from: "2026-10-01",
    p_without_team: false,
  });
  expect(error).not.toBeNull();
  const team = await anon.from("team_members").select("user_id");
  expect(team.data ?? []).toHaveLength(0);
});
