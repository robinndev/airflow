import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./support/local-supabase";

/*
 * The gallery, end to end: a visitor meets a demo character on their own
 * page; an artist adds art, gives their OC a page with that art as the
 * cover, adds more art straight onto the character, moves a piece to another
 * section, puts a piece in a collection, saves the character to their
 * moodboard and deletes the page (the art stays). Every picture an artist
 * posts hangs in their gallery too, tied to the post. Row level security
 * keeps other accounts out of it.
 */

function admin() {
  const { apiUrl, secretKey } = localSupabase();
  return createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function newAccount() {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return { handle: `e2e_${id}`, email: `e2e+${id}@artiflow.test`, password: `Teal-brush-${id}!`, id: "" };
}

const artist = newAccount();
const stranger = newAccount();
const poster = newAccount();

test.beforeAll(async () => {
  for (const account of [artist, stranger, poster]) {
    const { data, error } = await admin().auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { handle: account.handle, display_name: account.handle },
    });
    if (error) throw error;
    account.id = data.user.id;
  }
});

test.afterAll(async () => {
  for (const account of [artist, stranger, poster]) if (account.id) await admin().auth.admin.deleteUser(account.id);
});

async function signIn(page: Page, account = artist) {
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

const picture = (r: number, g: number, b: number, width = 640, height = 800) =>
  sharp({ create: { width, height, channels: 3, background: { r, g, b } } }).png().toBuffer();

/** Adds pictures through the open Add art dialog and waits for them to be saved. */
async function addArt(page: Page, files: { name: string; buffer: Buffer }[], where?: (dialog: ReturnType<Page["getByRole"]>) => Promise<void>) {
  const dialog = page.getByRole("dialog", { name: "Add art" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Choose pictures").setInputFiles(files.map((f) => ({ ...f, mimeType: "image/png" })));
  await expect(dialog.getByRole("textbox", { name: /Title of picture/ })).toHaveCount(files.length);
  if (where) await where(dialog);
  await dialog.getByRole("button", { name: files.length > 1 ? `Add ${files.length} pieces` : "Add to gallery" }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test("a visitor meets a character on their own page", async ({ page }) => {
  await page.goto("/pebblecat/gallery");
  const folder = page.getByRole("link", { name: /Kinako/ }).first();
  await expect(folder).toBeVisible();
  await folder.click();

  await expect(page).toHaveURL(/\/pebblecat\/characters\/kinako$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kinako" })).toBeVisible();
  for (const section of ["Design", "Outfits", "Expressions & poses", "Alternate versions"]) {
    await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${section}`) })).toBeVisible();
  }
  await expect(page.locator('[data-part="ref-sheet"]').getByText("Fox spirit", { exact: true })).toBeVisible();

  // Nothing of the owner's shows for visitors.
  await expect(page.getByRole("button", { name: "Edit page" })).toHaveCount(0);

  // Saving a character asks visitors to sign in.
  const save = page.getByRole("button", { name: "Save Kinako" });
  await expect(async () => {
    await save.click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fpebblecat%2Fcharacters%2Fkinako/, { timeout: 1500 });
  }).toPass();
});

test("an artist builds a character page from their gallery", async ({ page, browser }) => {
  await signIn(page);
  await page.goto(`/${artist.handle}/gallery`);
  await expect(page.getByText("No artworks yet")).toBeVisible();

  // Add two pieces at once.
  await page.getByRole("button", { name: "Add art" }).first().click();
  await addArt(page, [
    { name: "luna-design.png", buffer: await picture(70, 90, 200) },
    { name: "moon_sketch.png", buffer: await picture(220, 210, 120, 800, 600) },
  ]);
  await expect(page.getByRole("button", { name: "View Luna design" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View Moon sketch" })).toBeVisible();

  // Give the OC a page, with the design as the cover.
  await page.getByRole("button", { name: "New character" }).first().click();
  const sheet = page.getByRole("dialog", { name: "New character" });
  await sheet.getByPlaceholder("Luna").fill("Luna");
  await sheet.getByPlaceholder("Fox spirit, human, dragon…").fill("Moon moth");
  await sheet.getByLabel("Personality").fill("Dreamy");
  await sheet.getByLabel("Personality").press("Enter");
  await sheet.getByRole("button", { name: "Use Luna design as the cover" }).click();
  await sheet.getByRole("button", { name: "Create page" }).click();

  await expect(page).toHaveURL(new RegExp(`/${artist.handle}/characters/luna$`), { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Luna" })).toBeVisible();
  const refSheet = page.locator('[data-part="ref-sheet"]');
  await expect(refSheet.getByText("Moon moth", { exact: true })).toBeVisible();
  await expect(refSheet.getByText("Dreamy", { exact: true })).toBeVisible();
  const design = page.locator("section#design");
  await expect(design.getByRole("button", { name: "View Luna design" })).toBeVisible();

  // Art added from her page goes straight onto her.
  await page.getByRole("button", { name: "Add art of Luna" }).click();
  await addArt(page, [{ name: "luna-in-the-rain.png", buffer: await picture(40, 160, 150) }]);
  await expect(page.locator("section#art").getByRole("button", { name: "View Luna in the rain" })).toBeVisible();

  // Move it to Outfits from its menu.
  await page.locator("section#art").getByRole("button", { name: "Options for Luna in the rain" }).click();
  await page.getByRole("button", { name: "Move to another section" }).click();
  await page.locator(":popover-open").getByRole("button", { name: "Outfits", exact: true }).click();
  await expect(page.locator("section#outfits").getByRole("button", { name: "View Luna in the rain" })).toBeVisible();

  // Anyone can see her page.
  const visitor = await browser.newPage();
  await visitor.goto(`/${artist.handle}/characters/luna`);
  await expect(visitor.getByRole("heading", { level: 1, name: "Luna" })).toBeVisible();
  await expect(visitor.locator("section#outfits").getByRole("button", { name: "View Luna in the rain" })).toBeVisible();
  await expect(visitor.getByRole("button", { name: "Edit page" })).toHaveCount(0);
  await visitor.close();

  // Save her (the character, not just the artist) to the moodboard.
  const save = page.getByRole("button", { name: "Save Luna" });
  await expect(async () => {
    if ((await save.getAttribute("aria-pressed")) !== "true") await save.click();
    await expect(page.getByRole("button", { name: "Saved", pressed: true })).toBeVisible({ timeout: 1500 });
  }).toPass();
  // The button flips before the save lands: wait for the row.
  await expect
    .poll(async () => (await admin().from("favorites").select("kind, character_id").eq("user_id", artist.id)).data)
    .toEqual([expect.objectContaining({ kind: "character" })]);
  await page.goto("/favorites");
  await expect(page.getByRole("link", { name: /Luna/ }).first()).toBeVisible();

  // A collection, filled from a piece's own dialog.
  await page.goto(`/${artist.handle}/gallery`);
  await page.getByRole("button", { name: "New collection" }).first().click();
  const collection = page.getByRole("dialog", { name: "New collection" });
  await collection.getByPlaceholder("Fantasy landscapes, Expression studies…").fill("Moon studies");
  await collection.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(new RegExp(`/${artist.handle}/collections/moon-studies$`), { timeout: 15_000 });
  await expect(page.getByText("Nothing in here yet")).toBeVisible();

  await page.goto(`/${artist.handle}/gallery`);
  await page.getByRole("button", { name: "Options for Moon sketch" }).click();
  await page.getByRole("button", { name: "Edit details & where it shows" }).click();
  const edit = page.getByRole("dialog", { name: "Edit piece" });
  await edit.getByText("Moon studies", { exact: true }).click();
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden({ timeout: 15_000 });
  await page.goto(`/${artist.handle}/collections/moon-studies`);
  await expect(page.getByRole("button", { name: "View Moon sketch" })).toBeVisible();

  // Deleting her page keeps her art in the gallery.
  await page.goto(`/${artist.handle}/characters/luna`);
  await page.getByRole("button", { name: "Edit page" }).click();
  const editSheet = page.getByRole("dialog", { name: "Edit Luna" });
  await editSheet.getByRole("button", { name: "Delete" }).click();
  await editSheet.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`/${artist.handle}/gallery$`), { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "View Luna design" })).toBeVisible();
  const { count } = await admin().from("characters").select("id", { count: "exact", head: true }).eq("owner_id", artist.id);
  expect(count).toBe(0);
});

test("other accounts can't write to someone's gallery", async () => {
  const { apiUrl, publishableKey } = localSupabase();
  const supabase = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: stranger.email, password: stranger.password });
  expect(signInError).toBeNull();

  // A character and a piece of the artist's, made with the secret key.
  const { data: piece } = await admin()
    .from("artworks")
    .insert({ owner_id: artist.id, title: "Mine", image: { path: `${artist.id}/gallery/${crypto.randomUUID()}.png`, width: 10, height: 10, palette: [] } })
    .select("id")
    .single();
  const { data: character } = await admin()
    .from("characters")
    .insert({ owner_id: artist.id, slug: "guarded", name: "Guarded" })
    .select("id")
    .single();
  expect(piece && character).toBeTruthy();

  // The stranger can't make rows as the artist, rename their character or hang art on it.
  const asArtist = await supabase.from("characters").insert({ owner_id: artist.id, slug: "fake", name: "Fake" });
  expect(asArtist.error).not.toBeNull();
  await supabase.from("characters").update({ name: "Stolen" }).eq("id", character!.id);
  const { data: after } = await admin().from("characters").select("name").eq("id", character!.id).single();
  expect(after?.name).toBe("Guarded");
  const hung = await supabase.from("character_art").insert({ character_id: character!.id, artwork_id: piece!.id });
  expect(hung.error).not.toBeNull();

  // Nor put the artist's art on their own character, or point their own at someone else's file.
  const { data: own } = await supabase.from("characters").insert({ slug: "mine", name: "Mine" }).select("id").single();
  const borrowed = await supabase.from("character_art").insert({ character_id: own!.id, artwork_id: piece!.id });
  expect(borrowed.error).not.toBeNull();
  const foreignFile = await supabase
    .from("artworks")
    .insert({ title: "Not mine", image: { path: `${artist.id}/gallery/${crypto.randomUUID()}.png`, width: 10, height: 10 } });
  expect(foreignFile.error).not.toBeNull();
});

test("every picture an artist posts hangs in their gallery, tied to the post", async ({ page }) => {
  const pieces = async () =>
    (await admin().from("artworks").select("title, post_id, post_image").eq("owner_id", poster.id).order("post_image")).data ?? [];

  await signIn(page, poster);
  await page.goto(`/${poster.handle}`);
  const composer = page.getByRole("form", { name: "Create a post" });
  await expect(composer).toBeVisible();
  await composer.getByLabel("Post text").fill("Night market, lineart pass");
  await composer.getByText("WIP", { exact: true }).click();
  await composer.locator('input[type="file"]').setInputFiles([
    { name: "market-1.png", mimeType: "image/png", buffer: await picture(30, 60, 120) },
    { name: "market-2.png", mimeType: "image/png", buffer: await picture(200, 90, 60, 800, 600) },
  ]);
  await expect(composer.getByRole("button", { name: "Remove image 2" })).toBeVisible();
  await composer.getByRole("button", { name: "Post", exact: true }).click();

  // One piece per picture, titled from the caption, tied to the post.
  await expect.poll(async () => (await pieces()).map((p) => p.title)).toEqual(["Night market (1/2)", "Night market (2/2)"]);
  const [{ post_id: postId }] = await pieces();
  expect(postId).toBeTruthy();

  await page.goto(`/${poster.handle}/gallery`);
  const first = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "View Night market (1/2)" }) });
  await expect(first).toBeVisible();
  await expect(first.getByRole("link", { name: "From a post" })).toHaveAttribute("href", `/${poster.handle}#${postId}`);
  await expect(first.getByText("WIP", { exact: true })).toBeVisible();

  // The profile counts them.
  await expect(page.getByRole("link", { name: "Gallery, 2 artworks" }).first()).toBeAttached();

  // Taking one out of the gallery keeps the post.
  await page.getByRole("button", { name: "Options for Night market (2/2)" }).click();
  await page.getByRole("button", { name: "Take it out of the gallery" }).click();
  await page.getByRole("button", { name: "Take it out", exact: true }).click();
  await expect(page.getByRole("button", { name: "View Night market (2/2)" })).toHaveCount(0);
  await expect.poll(async () => (await pieces()).length).toBe(1);
  const { count: posts } = await admin().from("posts").select("id", { count: "exact", head: true }).eq("id", postId!);
  expect(posts).toBe(1);

  // Deleting the post takes its pictures off the gallery.
  await page.goto(`/${poster.handle}`);
  await page.getByRole("button", { name: "Post options" }).first().click();
  await page.getByRole("button", { name: "Delete post" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(async () => (await pieces()).length).toBe(0);
  await page.goto(`/${poster.handle}/gallery`);
  await expect(page.getByText("No artworks yet")).toBeVisible();
});
