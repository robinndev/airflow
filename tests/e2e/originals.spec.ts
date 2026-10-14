import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./support/local-supabase";

/*
 * Originals, thumbs and the server's check (roadmap: "original images, cheap
 * and safe"). A gallery upload keeps the file itself in the private
 * `originals` bucket, cleaned of metadata with its pixels untouched, plus a
 * thumb that walls load instead of the display copy; deleting the piece
 * takes all three. A hostile browser that uploads something else under a
 * picture's name is refused, and its file removed.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const artist = { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!`, id: "" };

test.beforeAll(async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: artist.email,
    password: artist.password,
    email_confirm: true,
    user_metadata: { handle: artist.handle, display_name: artist.handle },
  });
  if (error) throw error;
  artist.id = data.user.id;
});

test.afterAll(async () => {
  if (!artist.id) return;
  for (const bucket of ["art", "originals"]) {
    const { data } = await admin().storage.from(bucket).list(`${artist.id}/gallery`);
    if (data?.length) await admin().storage.from(bucket).remove(data.map((file) => `${artist.id}/gallery/${file.name}`));
  }
  await admin().auth.admin.deleteUser(artist.id);
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

/** A big phone photo of a drawing: detail to keep, and EXIF that names the phone and its owner. */
async function phonePhoto() {
  const width = 3000;
  const height = 2000;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const x = (i / 3) % width;
    raw[i] = x % 256;
    raw[i + 1] = (i / 3 / width) % 256;
    raw[i + 2] = 128;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92 })
    .withExif({ IFD0: { Make: "PhoneMaker", Model: "Pocket 12", Artist: "Jane Doe" } })
    .toBuffer();
}

async function filesIn(bucket: string) {
  const { data } = await admin().storage.from(bucket).list(`${artist.id}/gallery`);
  return (data ?? []).map((file) => file.name).sort();
}

test("a gallery upload keeps a private, clean original and a thumb; deleting the piece takes all three", async ({ page }) => {
  test.setTimeout(90_000); // A 6-megapixel photo: made, uploaded three ways, then compared pixel by pixel.
  const photo = await phonePhoto();
  await signIn(page);
  await page.goto(`/${artist.handle}/gallery`);
  await page.getByRole("button", { name: "Add art" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add art" });
  await dialog.getByLabel("Choose pictures").setInputFiles({ name: "inked_page.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(dialog.getByRole("textbox", { name: /Title of picture/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Add to gallery" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  const { data: row } = await admin().from("artworks").select("image").eq("owner_id", artist.id).single();
  const image = row!.image as {
    path: string;
    width: number;
    height: number;
    thumb: { width: number; height: number; type: string };
    original: { width: number; height: number; type: string; bytes: number };
  };
  expect([image.width, image.height]).toEqual([2400, 1600]);
  expect(image.thumb).toEqual({ width: 1024, height: 683, type: "image/webp" });
  expect(image.original).toMatchObject({ width: 3000, height: 2000, type: "image/jpeg" });

  const stem = image.path.replace(/\.webp$/, "");
  expect(await filesIn("art")).toEqual([`${stem.split("/").pop()}.thumb.webp`, `${stem.split("/").pop()}.webp`]);

  // The original is private: no public link, in either bucket.
  const { apiUrl } = localSupabase();
  for (const url of [`${apiUrl}/storage/v1/object/public/originals/${stem}.jpg`, `${apiUrl}/storage/v1/object/public/art/${stem}.jpg`]) {
    expect((await page.request.get(url)).ok()).toBe(false);
  }

  // It's the same picture, pixel for pixel, without the phone's name or its owner's.
  const { data: blob } = await admin().storage.from("originals").download(`${stem}.jpg`);
  const original = Buffer.from(await blob!.arrayBuffer());
  expect(original.length).toBe(image.original.bytes);
  expect(original.includes("PhoneMaker")).toBe(false);
  expect(original.includes("Jane Doe")).toBe(false);
  expect(await sharp(original).raw().toBuffer()).toEqual(await sharp(photo).raw().toBuffer());

  // The wall loads the thumb, straight from storage.
  const piece = page.getByRole("button", { name: "View Inked page" }).locator("img");
  await expect(piece).toBeVisible();
  await expect.poll(() => piece.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`${stem}.thumb.webp`);

  // Deleting the piece removes the display copy, the thumb and the original.
  await page.getByRole("button", { name: "Options for Inked page" }).click();
  await page.getByRole("button", { name: "Delete piece" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("button", { name: "View Inked page" })).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(() => filesIn("art")).toEqual([]);
  await expect.poll(() => filesIn("originals")).toEqual([]);
});

test("a file that isn't what its name says is refused and removed", async ({ page }) => {
  await signIn(page);

  // A hostile browser: the "picture" that reaches storage is a web page.
  const { apiUrl, publishableKey } = localSupabase();
  const asArtist = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await asArtist.auth.signInWithPassword({ email: artist.email, password: artist.password });
  if (signInError) throw signInError;
  await page.route("**/storage/v1/object/art/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname.split("/object/art/")[1]);
    if (route.request().method() !== "POST" || path.includes(".thumb.")) return route.continue();
    const { error } = await asArtist.storage
      .from("art")
      .upload(path, new Blob(["<!doctype html><script>alert(document.cookie)</script>"], { type: "image/png" }), { contentType: "image/png" });
    if (error) throw new Error(`Couldn't plant the fake picture: ${error.message}`);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: `art/${path}`, Id: crypto.randomUUID() }) });
  });

  await page.goto(`/${artist.handle}/gallery`);
  await page.getByRole("button", { name: "Add art" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add art" });
  const png = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 60, b: 90 } } }).png().toBuffer();
  await dialog.getByLabel("Choose pictures").setInputFiles({ name: "innocent.png", mimeType: "image/png", buffer: png });
  await dialog.getByRole("button", { name: "Add to gallery" }).click();

  await expect(dialog.getByText("That picture isn't what its name says.", { exact: false })).toBeVisible({ timeout: 15_000 });
  const { count } = await admin().from("artworks").select("id", { count: "exact", head: true }).eq("owner_id", artist.id);
  expect(count).toBe(0);
  await expect.poll(() => filesIn("art")).toEqual([]);
  await expect.poll(() => filesIn("originals")).toEqual([]);
});
