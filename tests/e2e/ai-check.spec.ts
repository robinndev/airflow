import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { cleanPng, novelAiPng, stealthPng } from "./support/ai-images";
import { localSupabase } from "./support/local-supabase";

/*
 * The upload's AI check, in a real browser: a file carrying NovelAI's
 * metadata is turned away with the "made by humans" dialog, the artist asks
 * for a review (it lands in ai_review_requests), settings hidden in the
 * pixels are caught too, and a clean image goes through.
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

async function pick(page: Page, name: string, buffer: Buffer) {
  const composer = page.getByRole("form", { name: "Create a post" });
  await composer.locator('input[type="file"]').setInputFiles({ name, mimeType: "image/png", buffer });
}

test("turns away AI images at upload and takes review requests", async ({ page }) => {
  await signIn(page);
  await page.goto(`/${account.handle}`);
  await expect(page.getByRole("form", { name: "Create a post" })).toBeVisible();

  // NovelAI's metadata
  await pick(page, "novelai_cat.png", await novelAiPng());
  const dialog = page.getByRole("dialog", { name: "This image says it was made with AI" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("novelai_cat.png");
  await expect(dialog).toContainText("NovelAI");

  await dialog.getByRole("button", { name: "I made this myself" }).click();
  await page.getByLabel("How did you make it?").fill("Drew it in Clip Studio, promise.");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByRole("dialog", { name: "Thanks for telling us" })).toBeVisible();

  const { data: requests } = await admin()
    .from("ai_review_requests")
    .select("file_name, generator, evidence, note, status")
    .eq("requester_id", userId);
  expect(requests).toEqual([
    {
      file_name: "novelai_cat.png",
      generator: "NovelAI",
      evidence: 'PNG text "Software": NovelAI',
      note: "Drew it in Clip Studio, promise.",
      status: "open",
    },
  ]);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Settings hidden in the alpha channel: read from the pixels by the browser's canvas
  await pick(page, "stealth.png", await stealthPng());
  await expect(page.getByRole("dialog", { name: "This image says it was made with AI" })).toContainText("NovelAI or Stable Diffusion");
  await page.getByRole("button", { name: "Close" }).click();

  // A clean image goes through
  await pick(page, "my_drawing.png", await cleanPng());
  await expect(page.getByRole("button", { name: "Images 1/4" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
