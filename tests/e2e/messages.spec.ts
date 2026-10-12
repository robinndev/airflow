import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * Direct messages, end to end, between two real accounts in two browsers:
 * visitors are sent to sign in; nobody holds a WebSocket until their chat
 * opens; Ana writes to Bo from his profile; Bo's header shows it unread (by
 * pulse, his chat is closed), he opens it, Ana sees "Seen" and Bo
 * "sketching", Bo's reply reaches Ana live; with his chat closed, a letter
 * drops in with the chime and "(1)" in the tab title, and Reply opens it
 * (Ana sees "Here now"); archiving moves the conversation
 * to Archived until a new message brings it back; a third account can't read
 * any of it. Demo artists say they won't write back.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Account = { handle: string; name: string; email: string; password: string; id?: string };

const run = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const account = (who: string, name: string): Account => ({
  handle: `e2e_${who}_${run}`,
  name,
  email: `e2e+${who}${run}@artiflow.test`,
  password: `Teal-brush-${run}!`,
});
const ana = account("ana", "Ana Lua");
const bo = account("bo", "Bo Rivera");
const cy = account("cy", "Cy Moss");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const person of [ana, bo, cy]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.name },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
});

test.afterAll(async () => {
  for (const person of [ana, bo, cy]) if (person.id) await admin().auth.admin.deleteUser(person.id);
});

/** Counts the studio chime's oscillators (it's synthesized, so there's no file to wait for). */
function countChimes() {
  const counted = window as unknown as { __oscillators: number };
  counted.__oscillators = 0;
  const create = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function (this: AudioContext) {
    counted.__oscillators++;
    return create.call(this);
  };
}
const chimes = (page: Page) => page.evaluate(() => (window as unknown as { __oscillators: number }).__oscillators);

/** Each test's browsers close when it ends: a tab left open on a conversation would read along in the next test. */
const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close();
});

async function signedIn(browser: Browser, person: Account) {
  const context = await browser.newContext();
  contexts.push(context);
  await context.addInitScript(countChimes);
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

/** With the chat closed there's no socket: news comes with the next pulse (every ~20s while the page is in use). */
const PULSE = 35_000;

const chat = (page: Page) => page.locator("dialog[open]");
const headerMessages = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^Messages/ }).last();

/** Clicks "Message" on a profile once it has hydrated, until the chat window opens. */
async function openChatFrom(page: Page, handle: string) {
  await page.goto(`/${handle}`);
  await expect(async () => {
    await page.getByRole("button", { name: "Message", exact: true }).click({ timeout: 1500 });
    await expect(chat(page).getByRole("textbox", { name: /^Message to/ })).toBeVisible({ timeout: 3000 });
  }).toPass();
}

test("visitors are sent to sign in to message an artist", async ({ page }) => {
  await page.goto("/mira");
  await page.getByRole("link", { name: "Message" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fmira/);
});

test("no WebSocket while browsing, one while chatting", async ({ browser }) => {
  const a = await signedIn(browser, ana);
  const sockets: string[] = [];
  a.on("websocket", (ws) => {
    if (ws.url().includes("/realtime/")) sockets.push(ws.url());
  });
  await a.goto("/explore");
  await a.waitForTimeout(3000);
  expect(sockets).toHaveLength(0);

  await openChatFrom(a, "mira");
  await expect.poll(() => sockets.length).toBe(1);
});

test("two artists talk live: unread, seen, sketching, reply", async ({ browser }) => {
  const a = await signedIn(browser, ana);
  const b = await signedIn(browser, bo);
  await b.goto("/");
  await expect(headerMessages(b)).toHaveAccessibleName("Messages");

  await openChatFrom(a, bo.handle);
  await expect(chat(a).getByText("The start of your letters with Bo")).toBeVisible();
  const box = chat(a).getByRole("textbox", { name: "Message to Bo" });
  await box.fill("Hi Bo! Would you take a half-body of my OC?");
  await box.press("Enter");
  await expect(chat(a).getByText("Hi Bo! Would you take a half-body of my OC?")).toBeVisible();

  // Bo's header hears about it without reloading (his chat is closed, so by the next pulse).
  await expect(headerMessages(b)).toHaveAccessibleName("Messages, 1 unread", { timeout: PULSE });
  await headerMessages(b).click();
  // The inbox row (a letter with the same name may have dropped in too).
  await b.getByRole("listitem").getByRole("button", { name: /Ana Lua/ }).click();
  await expect(chat(b).getByText("Hi Bo! Would you take a half-body of my OC?")).toBeVisible();
  await expect(headerMessages(b)).toHaveAccessibleName("Messages");

  // Ana sees it was read, and that Bo is writing.
  await expect(chat(a).getByText("Seen")).toBeVisible();
  const reply = chat(b).getByRole("textbox", { name: "Message to Ana" });
  await reply.pressSequentially("Yes! I have", { delay: 40 });
  await expect(chat(a).getByText("Bo is sketching…")).toBeVisible();
  await reply.pressSequentially(" two slots this month.");
  await reply.press("Enter");
  await expect(chat(a).getByText("Yes! I have two slots this month.")).toBeVisible();
  await expect(chat(a).getByText("Bo is sketching…")).toBeHidden();

  // Both messages are stored once, in one conversation.
  const { data: rows } = await admin().from("messages").select("body, conversation_id").in("sender_id", [ana.id!, bo.id!]);
  expect(rows?.map((r) => r.body).sort()).toEqual(["Hi Bo! Would you take a half-body of my OC?", "Yes! I have two slots this month."]);
  expect(new Set(rows?.map((r) => r.conversation_id)).size).toBe(1);
});

test("a letter arrives while the chat is closed: chime, title, Reply", async ({ browser }) => {
  const a = await signedIn(browser, ana);
  const b = await signedIn(browser, bo);
  // Messages already waiting when a page opens show as a badge, not a letter: let Bo's page take its first pulse.
  const firstPulse = b.waitForResponse((response) => response.url().includes("/rpc/message_pulse"));
  await b.goto("/explore");
  await firstPulse;
  // Browsers only allow sound after the first click on the page.
  await b.mouse.click(4, 300);

  await openChatFrom(a, bo.handle);
  const box = chat(a).getByRole("textbox", { name: "Message to Bo" });
  await box.fill("Are you around this weekend?");
  await box.press("Enter");

  const letter = b.getByRole("status").filter({ hasText: "New letter" });
  await expect(letter).toContainText("Ana Lua", { timeout: PULSE });
  await expect(letter).toContainText("Are you around this weekend?");
  await expect.poll(() => chimes(b)).toBeGreaterThan(0);
  await expect(b).toHaveTitle(/^\(1\) /);

  await letter.getByRole("button", { name: "Reply to Ana" }).click();
  await expect(chat(b).getByText("Are you around this weekend?")).toBeVisible();
  await expect(letter).toBeHidden();
  await expect(b).not.toHaveTitle(/^\(\d+\) /);
  // Both have it open: Ana sees Bo is here.
  await expect(chat(a).getByText("Here now")).toBeVisible();

  // While Bo is looking at the conversation, new messages there don't ring.
  const rung = await chimes(b);
  await box.fill("Great, talk soon!");
  await box.press("Enter");
  await expect(chat(b).getByText("Great, talk soon!")).toBeVisible();
  await b.waitForTimeout(1000);
  expect(await chimes(b)).toBe(rung);
});

test("archiving tucks a conversation away until someone writes again", async ({ browser }) => {
  const a = await signedIn(browser, ana);
  await openChatFrom(a, bo.handle);
  await chat(a).getByRole("button", { name: "Archive conversation" }).click();
  await expect(a.getByText("Archived your letters with Bo")).toBeVisible();

  await headerMessages(a).click();
  const menu = a.getByRole("tablist", { name: "Filter messages" }).locator("..").locator("..");
  await expect(menu.getByRole("button", { name: /Bo Rivera/ })).toBeHidden();
  await menu.getByRole("tab", { name: "Archived" }).click();
  await expect(menu.getByRole("button", { name: /Bo Rivera/ })).toBeVisible();

  // A new message from Bo brings it back to the inbox.
  const b = await signedIn(browser, bo);
  await openChatFrom(b, ana.handle);
  const box = chat(b).getByRole("textbox", { name: "Message to Ana" });
  await box.fill("Sending you the sketch tomorrow!");
  await box.press("Enter");
  await menu.getByRole("tab", { name: "All" }).click();
  await expect(menu.getByRole("button", { name: /Bo Rivera/ })).toBeVisible({ timeout: PULSE });
});

test("nobody else can read the conversation", async () => {
  const { apiUrl, publishableKey } = localSupabase();
  const outsider = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await outsider.auth.signInWithPassword({ email: cy.email, password: cy.password });
  expect(error).toBeNull();
  const { data: messages } = await outsider.from("messages").select("id");
  const { data: conversations } = await outsider.from("conversations").select("id");
  expect(messages).toEqual([]);
  expect(conversations).toEqual([]);

  const { data: real } = await admin().from("conversations").select("id").eq("started_by", ana.id!).limit(1).single();
  const { error: writeError } = await outsider.from("messages").insert({ conversation_id: real!.id, body: "hi" });
  expect(writeError).not.toBeNull();
});

test("demo artists say they won't write back", async ({ browser }) => {
  const a = await signedIn(browser, ana);
  await openChatFrom(a, "mira");
  await expect(chat(a).getByText("Mira is a demo artist.")).toBeVisible();
  await chat(a).getByRole("button", { name: "Ask about a commission" }).click();
  await expect(chat(a).getByRole("textbox", { name: "Message to Mira" })).toHaveValue(/I'd love to commission you/);
  // Their studio card sits beside the conversation.
  await expect(chat(a).getByRole("link", { name: "Request a commission" })).toBeVisible();
});
