import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./support/local-supabase";

/*
 * The bio box and button colors (asked for 2026-10-15): the headline and bio
 * can sit on a card so they read on any background (off by default; the box
 * is free, its color is Flow+), and the Message / Commission buttons take
 * colors of their own (Flow+), with text that picks itself to read on them.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Account = { handle: string; email: string; password: string; id: string };
const run = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const account = (who: string): Account => ({
  handle: `e2e_${who}_${run}`,
  email: `e2e+${who}${run}@artiflow.test`,
  password: `Teal-brush-${run}!`,
  id: "",
});
const flowPlus = account("bx");
const free = account("fb");

test.beforeAll(async () => {
  for (const person of [flowPlus, free]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { handle: person.handle, display_name: person.handle },
    });
    if (error) throw error;
    person.id = data.user.id;
  }
  const { error } = await admin().from("profiles").update({ plan: "flow_plus", headline: "Hobbyist · Anthro/Feral" }).eq("id", flowPlus.id);
  if (error) throw error;
});

test.afterAll(async () => {
  for (const person of [flowPlus, free]) if (person.id) await admin().auth.admin.deleteUser(person.id);
});

async function signIn(page: Page, person: Account) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactProps"));
  });
  await page.getByLabel("Email or handle").fill(person.handle);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

/** Opens a customizer tab once React owns it. */
async function customize(page: Page, tab: string) {
  await page.goto(`/customize?tab=${tab}`);
  await page.waitForFunction(() => {
    const radio = document.querySelector('[role="radio"]');
    return !!radio && Object.keys(radio).some((key) => key.startsWith("__reactProps"));
  });
}

test("a Flow+ artist puts the bio on a colored card and colors the second buttons", async ({ page }) => {
  await signIn(page, flowPlus);

  // Off by default: the profile shows the bio as before.
  await page.goto(`/${flowPlus.handle}`);
  const intro = page.locator('[data-profile-canvas] [data-part="intro"]');
  await expect(intro).toBeVisible();
  await expect(intro).not.toHaveClass(/rounded-card/);

  await customize(page, "name");
  await page.getByRole("radiogroup", { name: "Bio box" }).getByRole("radio", { name: "On a card" }).click();
  await page.getByRole("button", { name: "Card color: #173b5b" }).click();

  await page.getByRole("tab", { name: "Buttons & layout" }).click();
  await page.getByRole("button", { name: "Message & Edit profile: #ffd166" }).click();
  await page.getByRole("button", { name: "Commission & Customize: #21d4e5" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved — live on your page")).toBeVisible();

  await page.goto(`/${flowPlus.handle}`);
  await expect(intro).toHaveClass(/rounded-card/);
  // A dark card: the text re-inks itself to read on it.
  await expect(intro).toHaveCSS("background-color", "rgb(23, 59, 91)");
  await expect(intro.locator('[data-part="headline"]')).toHaveCSS("color", "rgb(255, 255, 255)");

  // The canvas carries the button colors; buttons inside it take them.
  const canvas = page.locator("[data-profile-canvas]");
  await expect(canvas).toHaveAttribute("data-button-second", "");
  await expect(canvas).toHaveAttribute("data-button-soft", "");
  await expect(canvas.locator('[data-part="actions"] .action-soft').first()).toHaveCSS("background-color", "rgb(33, 212, 229)");
});

test("free accounts can use the box, but its color waits for Flow+", async ({ page }) => {
  await signIn(page, free);
  await customize(page, "name");
  await page.getByRole("radiogroup", { name: "Bio box" }).getByRole("radio", { name: "On a card" }).click();
  await page.getByRole("button", { name: "Card color: #ffd166" }).click();

  // The color previews, but saving it is refused: nothing is stored.
  const save = page.getByRole("button", { name: "Save" });
  const answer = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/customize"));
  await save.click();
  await answer;
  await expect(page.getByText("Saved — live on your page")).toHaveCount(0);
  expect(await storedBio(free)).toBeUndefined();

  // Back to the card color: the box alone saves.
  await page.getByRole("button", { name: "Reset" }).click();
  await save.click();
  await expect(page.getByText("Saved — live on your page")).toBeVisible();
  expect(await storedBio(free)).toEqual({ box: true });

  await page.goto(`/${free.handle}`);
  await expect(page.locator('[data-profile-canvas] [data-part="intro"]')).toHaveClass(/rounded-card/);
});

/** The bio box as stored on the profile (undefined when nothing was saved). */
async function storedBio(person: Account) {
  const { data, error } = await admin().from("profiles").select("customization").eq("id", person.id).single();
  if (error) throw error;
  return (data.customization as { bio?: unknown } | null)?.bio;
}
