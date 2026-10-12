import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Notifications, end to end: a fan follows, likes, comments, reposts and
 * replies; the artist's bell counts it from the pulse, opening it lists
 * everything (the like without anyone's name) and marks it read, and a reply
 * opens its thread. Taking a like or a follow back takes the notice back,
 * following again doesn't ping twice, the page filters, and nobody else can
 * read or write someone's notifications.
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
const artist = account("ink", "Ina Kestrel");
const fan = account("fan", "Fen Marlow");
const lurker = account("cy", "Cy Moss");
let postId: string;

/** A Supabase client signed in as someone: the same row level security the app's actions run under. */
async function as(person: Account) {
  const { apiUrl, publishableKey } = localSupabase();
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: person.email, password: person.password });
  if (error) throw error;
  return client;
}

async function notices(kind: string, actor?: Account) {
  let query = admin().from("notifications").select("id, tally, read_at, actor_id").eq("recipient_id", artist.id).eq("kind", kind);
  if (actor) query = query.eq("actor_id", actor.id);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const person of [artist, fan, lurker]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.name },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
  const { data, error } = await admin()
    .from("posts")
    .insert({ author_id: artist.id, kind: "update", body: `Lighthouse study by ${artist.handle}` })
    .select("id")
    .single();
  if (error) throw error;
  postId = data.id;
});

test.afterAll(async () => {
  for (const person of [artist, fan, lurker]) if (person.id) await admin().auth.admin.deleteUser(person.id);
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

const bell = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^Notifications/ });
const book = (page: Page) => page.locator("ul").filter({ has: page.getByText("Ex libris") });

/** Opens a page and waits for its first pulse (the badge comes from it). */
async function openWithPulse(page: Page, path: string) {
  const pulse = page.waitForResponse((response) => response.url().includes("/rpc/message_pulse"));
  await page.goto(path);
  await pulse;
}

test("visitors are asked to sign in", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page.getByText("Your guest book opens when you sign in.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).last()).toHaveAttribute("href", "/sign-in?next=/notifications");
});

test("the bell counts what happened, lists it and marks it read", async ({ browser }) => {
  const client = await as(fan);
  for (const step of [
    client.from("follows").insert({ followee_id: artist.id }),
    client.from("post_likes").insert({ post_id: postId }),
    client.from("comments").insert({ author_id: fan.id, post_id: postId, body: "This lighthouse glows ✨" }),
    client.from("posts").insert({ author_id: fan.id, kind: "update", body: "Everyone look at this", quote_post_id: postId }),
  ]) {
    const { error } = await step;
    if (error) throw error;
  }

  const page = await signedIn(browser, artist);
  await openWithPulse(page, "/explore");
  // The welcome note, a follow, a like, a comment and a repost.
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications, 5 unread");

  await bell(page).click();
  const list = book(page);
  await expect(list.getByText(`${fan.name} started following you`)).toBeVisible();
  await expect(list.getByText(`${fan.name} commented on`)).toBeVisible();
  await expect(list.getByText("This lighthouse glows ✨")).toBeVisible();
  await expect(list.getByText(`${fan.name} reposted`)).toBeVisible();
  await expect(list.getByRole("button", { name: `Follow @${fan.handle} back` })).toBeVisible();
  // Likes never say who.
  const like = list.locator("li").filter({ hasText: "A new like on" });
  await expect(like).toBeVisible();
  await expect(like).not.toContainText(fan.name);
  await expect(like).not.toContainText(fan.handle);
  // What was new stays marked while the bell is open (the welcome bookplate has no mark); the badge is gone.
  await expect(list.getByText("New", { exact: true })).toHaveCount(4);
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications");

  await expect.poll(async () => (await notices("like")).every((n) => n.read_at)).toBe(true);
  await openWithPulse(page, "/explore");
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications");
});

test("a reply rings the bell on the next pulse and opens its thread", async ({ browser }) => {
  const own = await as(artist);
  const { data: mine, error } = await own
    .from("comments")
    .insert({ author_id: artist.id, post_id: postId, body: "Thanks! It took a week." })
    .select("id")
    .single();
  if (error) throw error;

  const page = await signedIn(browser, artist);
  await openWithPulse(page, "/explore");
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications");

  const reply = await (await as(fan))
    .from("comments")
    .insert({ author_id: fan.id, post_id: postId, parent_id: mine.id, body: "A week well spent" });
  if (reply.error) throw reply.error;
  // Coming back to the tab pulses right away.
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(bell(page)).toHaveAttribute("aria-label", "Notifications, 1 unread", { timeout: 35_000 });

  await bell(page).click();
  await book(page).getByText(`${fan.name} replied to your comment on`).click();
  await page.waitForURL(`**/${artist.handle}#${postId}`);
  const thread = page.locator("dialog[open]");
  await expect(thread.getByText("A week well spent")).toBeVisible();
});

test("taking a like or a follow back takes its notice back; following again doesn't ping twice", async () => {
  const client = await as(lurker);
  await client.from("follows").insert({ followee_id: artist.id });
  await client.from("post_likes").insert({ post_id: postId });
  expect(await notices("follow", lurker)).toHaveLength(1);
  expect((await notices("like")).find((n) => !n.read_at)?.tally).toBe(1);

  await client.from("post_likes").delete().eq("user_id", lurker.id).eq("post_id", postId);
  await client.from("follows").delete().eq("follower_id", lurker.id).eq("followee_id", artist.id);
  expect(await notices("follow", lurker)).toHaveLength(0);
  expect((await notices("like")).filter((n) => !n.read_at)).toHaveLength(0);

  // Once someone has been told, follow / unfollow / follow doesn't tell them again.
  await client.from("follows").insert({ followee_id: artist.id });
  await admin().from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", artist.id);
  await client.from("follows").delete().eq("follower_id", lurker.id).eq("followee_id", artist.id);
  await client.from("follows").insert({ followee_id: artist.id });
  const follows = await notices("follow", lurker);
  expect(follows).toHaveLength(1);
  expect(follows[0].read_at).not.toBeNull();
});

test("the guest book filters by kind", async ({ browser }) => {
  const page = await signedIn(browser, artist);
  await page.goto("/notifications?show=likes");
  const list = page.getByRole("region", { name: "Notifications" });
  await expect(list.getByText("A new like on")).toBeVisible();
  await expect(list.getByText(`${fan.name} started following you`)).toHaveCount(0);

  await page.getByRole("link", { name: "Follows", exact: true }).click();
  await expect(list.getByText(`${fan.name} started following you`)).toBeVisible();
  await expect(list.getByText("A new like on")).toHaveCount(0);
});

test("nobody else can read or write someone's notifications", async () => {
  const client = await as(fan);
  const read = await client.from("notifications").select("id").eq("recipient_id", artist.id);
  expect(read.error).toBeNull();
  expect(read.data).toHaveLength(0);

  const forged = await client.from("notifications").insert({ recipient_id: artist.id, kind: "follow", actor_id: fan.id });
  expect(forged.error).not.toBeNull();

  const unread = await client.from("notifications").update({ read_at: null }).eq("recipient_id", artist.id).select("id");
  expect(unread.data ?? []).toHaveLength(0);
});
