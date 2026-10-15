import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./support/local-supabase";

/*
 * The image viewer (gallery, profile posts, home feed): it fits the picture
 * to the screen, and "View original size" shows it at its own size, one
 * image pixel per CSS pixel, so small art and pixel art aren't blown up.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const account = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!` };
const cleanup: string[] = [];

test.beforeAll(async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { handle: account.handle, display_name: account.handle },
  });
  if (error) throw error;
  cleanup.push(data.user.id);
});

test.afterAll(async () => {
  for (const userId of cleanup) await admin().auth.admin.deleteUser(userId);
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

test("a small piece opens fitted, and at its own size with View original size", async ({ page }) => {
  await signIn(page);
  await page.goto(`/${account.handle}/gallery`);
  await page.getByRole("button", { name: "Add art" }).first().click();
  const add = page.getByRole("dialog", { name: "Add art" });
  const buffer = await sharp({ create: { width: 240, height: 160, channels: 3, background: { r: 200, g: 120, b: 220 } } }).png().toBuffer();
  await add.getByLabel("Choose pictures").setInputFiles({ name: "tiny-pony.png", mimeType: "image/png", buffer });
  await add.getByRole("button", { name: "Add to gallery" }).click();
  await expect(add).toBeHidden({ timeout: 15_000 });

  await page.getByRole("button", { name: "View Tiny pony" }).click();
  const viewer = page.getByRole("dialog", { name: "Image viewer" });
  const art = viewer.getByRole("img", { name: /Tiny pony/i });

  // Fitted: stretched to the screen.
  await expect(async () => expect((await art.boundingBox())!.width).toBeGreaterThan(600)).toPass();

  // Its own size: 240 × 160, no bigger.
  const toggle = viewer.getByRole("button", { name: /View original size/ });
  await expect(toggle).toContainText("240 × 160");
  await toggle.click();
  await expect(async () => {
    const box = (await art.boundingBox())!;
    expect(Math.round(box.width)).toBe(240);
    expect(Math.round(box.height)).toBe(160);
  }).toPass();

  // And back.
  await viewer.getByRole("button", { name: /Fit to screen/ }).click();
  await expect(async () => expect((await art.boundingBox())!.width).toBeGreaterThan(600)).toPass();

  // Clicking the dark around a picture at its own size closes the viewer.
  await viewer.getByRole("button", { name: /View original size/ }).click();
  await page.mouse.click(120, 360);
  await expect(viewer).toBeHidden();
});
