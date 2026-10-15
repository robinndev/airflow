import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Commission notices live apart from the guest book (Sabrina's ask: a
 * popular artist's requests shouldn't drown in likes and follows). The pulse
 * counts them for the header's order clipboard, the bell counts only the
 * rest, opening one reads only its own, and the clipboard leads to My
 * commissions / My requests (collectors get My requests only).
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
const artist = account("pad", "Pia Dunmore");
const buyer = account("buy", "Bo Yarrow");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const person of [artist, buyer]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.name },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
  const { error } = await admin().rpc("set_artist_access", { handle: artist.handle, artist: true });
  if (error) throw error;
  // Read the welcome and artist notes, so each side starts from a known count.
  await admin().from("notifications").update({ read_at: new Date().toISOString() }).in("recipient_id", [artist.id, buyer.id]);

  // A follow for the guest book, and a new request for the clipboard (as the commission trigger writes it).
  const { error: noteError } = await admin()
    .from("notifications")
    .insert([
      { recipient_id: artist.id, kind: "follow", actor_id: buyer.id, data: {} },
      {
        recipient_id: artist.id,
        kind: "commission_request",
        actor_id: buyer.id,
        data: { service: "Sticker pack", status: "pending", brief: "My fox with a lantern, please", estimate_usd: 40 },
      },
    ]);
  if (noteError) throw noteError;
});

test.afterAll(async () => {
  for (const person of [artist, buyer]) if (person.id) await admin().auth.admin.deleteUser(person.id);
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

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const clipboard = (page: Page) => nav(page).getByRole("button", { name: /^Commissions/ });
const bell = (page: Page) => nav(page).getByRole("button", { name: /^Notifications/ });
/** The header menu that's open (closed ones stay mounted, inert). */
const panel = (page: Page) => nav(page).locator('[data-open="true"]');

/** Opens a page and waits for its first pulse (the badges come from it). */
async function openWithPulse(page: Page, path: string) {
  const pulse = page.waitForResponse((response) => response.url().includes("/rpc/message_pulse"));
  await page.goto(path);
  await pulse;
}

async function readAt(kind: string) {
  const { data, error } = await admin().from("notifications").select("read_at").eq("recipient_id", artist.id).eq("kind", kind).single();
  if (error) throw error;
  return data.read_at as string | null;
}

test("commission notices get their own count and clipboard, and only they are read there", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await openWithPulse(page, "/explore/studios");

  // Each button counts its own.
  await expect(clipboard(page)).toHaveAttribute("aria-label", "Commissions, 1 unread");
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications, 1 unread");

  await clipboard(page).click();
  await expect(panel(page).getByRole("link", { name: /requested Sticker pack/ })).toBeVisible();
  await expect(panel(page).getByText("My fox with a lantern, please")).toBeVisible();
  await expect(panel(page).getByRole("link", { name: "My commissions" })).toHaveAttribute("href", "/commissions");
  await expect(panel(page).getByRole("link", { name: "My requests" })).toHaveAttribute("href", "/requests");

  // Opening the clipboard read the request, not the follow.
  await expect(clipboard(page)).toHaveAttribute("aria-label", "Commissions");
  await expect.poll(() => readAt("commission_request")).not.toBeNull();
  expect(await readAt("follow")).toBeNull();
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications, 1 unread");

  // The bell is the guest book: the follow, never the request.
  await page.keyboard.press("Escape");
  await bell(page).click();
  await expect(panel(page).getByRole("link", { name: new RegExp(`${buyer.name}.*started following you`) })).toBeVisible();
  await expect(panel(page).getByRole("link", { name: /requested Sticker pack/ })).toHaveCount(0);
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications");
  await expect.poll(() => readAt("follow")).not.toBeNull();

  // And so is the book: no Requests flag, no request.
  await page.goto("/notifications");
  const book = page.getByRole("main");
  await expect(book.getByRole("link", { name: new RegExp(`${buyer.name}.*started following you`) })).toBeVisible();
  await expect(book.getByRole("link", { name: /requested Sticker pack/ })).toHaveCount(0);
  await expect(book.getByRole("link", { name: "Requests", exact: true })).toHaveCount(0);
});

test("collectors get the clipboard with My requests only", async ({ browser }) => {
  const page = await signedIn(browser, buyer);
  await openWithPulse(page, "/explore/studios");
  await clipboard(page).click();
  await expect(panel(page).getByText("Nothing on the pad yet.")).toBeVisible();
  await expect(panel(page).getByRole("link", { name: "My requests" })).toBeVisible();
  await expect(panel(page).getByRole("link", { name: "My commissions" })).toHaveCount(0);
});
