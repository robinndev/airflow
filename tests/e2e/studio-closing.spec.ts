import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * A commission service can only be closed or deleted once every commission on
 * it is done (src/lib/listings/closing.ts, *_close_only_when_done.sql). With
 * a request still open, closing it and deleting it from /studio are refused
 * with a note on the sheet, and "Pause all" leaves it open and says so. Once
 * the request is declined, it closes and goes. The database refuses it too,
 * and deleting the artist's account still takes their services with it.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const artist = { handle: `e2e_s${id}`, email: `e2e+s${id}@artiflow.test`, password: `Teal-brush-${id}!` };
const buyer = { handle: `e2e_q${id}`, email: `e2e+q${id}@artiflow.test`, password: `Teal-brush-${id}!` };
const title = `Sticker pack ${id}`;
const ids: string[] = [];
let serviceId = "";
let requestId = "";

test.describe.configure({ mode: "serial" });

async function listService(name: string) {
  const { data, error } = await admin()
    .from("services")
    .insert({
      owner_id: ids[0],
      title: name,
      category: "emotes",
      packages: [{ id: "pack", label: "Pack of 3", priceUsd: 30, includes: [] }],
      turnaround_min_days: 5,
      turnaround_max_days: 10,
      slots_total: 3,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function request(service: string, name: string) {
  const { data, error } = await admin()
    .from("commission_requests")
    .insert({ buyer_id: ids[1], artist_id: ids[0], service_id: service, service_title: name, description: "Three stickers of my bunny OC, please!", budget: "under-50" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

test.beforeAll(async () => {
  for (const account of [artist, buyer]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.handle },
    });
    if (error) throw error;
    ids.push(data.user.id);
  }
  const { error } = await admin().rpc("set_artist_access", { handle: artist.handle, artist: true });
  if (error) throw error;
  serviceId = await listService(title);
  requestId = await request(serviceId, title);
});

test.afterAll(async () => {
  // The artist still has a service with an open request: deleting the account takes it anyway.
  for (const userId of ids) {
    const { error } = await admin().auth.admin.deleteUser(userId);
    expect(error).toBeNull();
  }
});

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(artist.handle);
  await page.getByLabel("Password", { exact: true }).fill(artist.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

const serviceRow = async () => (await admin().from("services").select("status, paused_status").eq("id", serviceId).maybeSingle()).data;

test("with a commission still open, the service can't be closed, deleted or paused", async ({ page }) => {
  await signIn(page);
  await page.goto("/studio");
  const status = page.getByRole("radiogroup", { name: `${title} status` });
  await expect(status).toBeVisible();

  // Closing: refused, with why and where to go.
  await status.getByText("Closed").click();
  const note = page.getByRole("alert").filter({ hasText: "Still in the works" });
  await expect(note).toContainText(`“${title}” stays open until its commissions are done: 1 request to answer.`);
  await expect(note.getByRole("link", { name: "See them in My commissions" })).toHaveAttribute("href", "/commissions?tab=attention");
  await expect(status.getByRole("radio", { name: "Open" })).toBeChecked();
  expect(await serviceRow()).toMatchObject({ status: "open" });
  await note.getByRole("button", { name: "Got it" }).click();
  await expect(note).toBeHidden();

  // Deleting: refused too.
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page.getByRole("alert").filter({ hasText: `You can't delete “${title}” yet: 1 request to answer.` })).toBeVisible();
  expect(await serviceRow()).toMatchObject({ status: "open" });

  // Pause all leaves it open, and says so.
  await page.getByRole("button", { name: "Pause all" }).click();
  await expect(page.getByRole("status")).toContainText(`“${title}” stays open until its commissions are done.`);
  expect(await serviceRow()).toMatchObject({ status: "open", paused_status: null });
});

test("once its commissions are done, it closes and can be deleted", async ({ page }) => {
  // The artist says no to the request: nothing is open on the service anymore.
  const { error } = await admin().from("commission_requests").update({ status: "declined" }).eq("id", requestId);
  if (error) throw error;

  await signIn(page);
  await page.goto("/studio");
  const status = page.getByRole("radiogroup", { name: `${title} status` });
  await status.getByText("Closed").click();
  await expect(page.getByRole("status")).toContainText(`${title} is closed`);
  await expect.poll(async () => (await serviceRow())?.status).toBe("closed");

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page.getByRole("status")).toContainText(`Deleted ${title}`);
  await expect.poll(serviceRow).toBeNull();
});

test("the database refuses it too, whatever writes it", async () => {
  const other = `Emote pack ${id}`;
  const otherId = await listService(other);
  await request(otherId, other);

  const close = await admin().from("services").update({ status: "closed" }).eq("id", otherId);
  expect(close.error?.message).toContain(`“${other}” stays open until its commissions are done`);
  const remove = await admin().from("services").delete().eq("id", otherId);
  expect(remove.error?.message).toContain(`You can't delete “${other}” yet`);

  // Filling up closes it by itself ("when full"): that isn't the artist closing it.
  const fill = await admin().from("services").update({ status: "closed", filled_at: new Date().toISOString() }).eq("id", otherId);
  expect(fill.error).toBeNull();
});
