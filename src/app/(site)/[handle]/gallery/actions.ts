"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { StoredImage } from "@/lib/art-storage";
import { variantFields } from "@/lib/images/schema";
import { removeFiles, verifyUploads } from "@/lib/images/verify";
import { galleryTag } from "@/lib/gallery/queries";
import { characterHref, cleanList, collectionHref, LIMITS, SECTION_IDS, uniqueSlug } from "@/lib/gallery/types";
import { WALL_TAG } from "@/lib/wall/query";
import { getViewer, type Viewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Writing the gallery: pieces, characters, collections and where each piece
 * is shown. Everything runs as the signed-in artist under row level security
 * (the tables only let owners write their own rows, and the triggers check
 * that art, covers and adoptables are theirs); these actions validate first
 * so the artist gets a readable message.
 */

export type GalleryResult = { ok: true; href?: string; ids?: string[]; warning?: string } | { ok: false; error: string };

const fail = (error: string): GalleryResult => ({ ok: false, error });

/** The signed-in owner of `handle`, or null. */
async function ownerOf(handle: string): Promise<Viewer | null> {
  const viewer = await getViewer();
  return viewer?.handle === handle ? viewer : null;
}

/** Forms submit line breaks as CRLF; store plain newlines. */
const lines = (text: string) => text.replace(/\r\n?/g, "\n");
const text = (max: number) => z.string().overwrite(lines).trim().max(max);
const list = (max: number, maxLength: number) =>
  z.array(z.string().max(200)).max(50).transform((values) => cleanList(values, max, maxLength));

const placement = z.object({
  characters: z.array(z.object({ id: z.uuid(), section: z.enum(SECTION_IDS) })).max(100),
  collections: z.array(z.uuid()).max(100),
});

const details = z.object({
  title: text(LIMITS.title).min(1, "Give it a title."),
  description: text(LIMITS.description),
  kind: z.enum(["personal", "commission"]),
  client: text(LIMITS.client).transform((v) => v.replace(/^@/, "") || null),
  tags: list(LIMITS.tags, LIMITS.tag),
});

const upload = z.object({
  path: z.string().max(200),
  width: z.number().int().min(1).max(8192),
  height: z.number().int().min(1).max(8192),
  palette: z
    .array(z.string().regex(/^#[0-9a-f]{6}$/i))
    .max(8)
    .transform((colors) => colors.map((c) => c.toLowerCase())),
  ...variantFields,
  title: text(LIMITS.title).min(1, "Give each piece a title."),
});

const addSchema = z.object({
  items: z.array(upload).min(1, "Add a picture first.").max(LIMITS.batch, `Add up to ${LIMITS.batch} pieces at a time.`),
  description: text(LIMITS.description),
  kind: z.enum(["personal", "commission"]),
  client: text(LIMITS.client).transform((v) => v.replace(/^@/, "") || null),
  tags: list(LIMITS.tags, LIMITS.tag),
  ...placement.shape,
});

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

/** Puts pieces on the given characters (in a section) and collections, replacing where they were. */
async function place(supabase: Supabase, artworkIds: string[], where: z.infer<typeof placement>, replace: boolean) {
  if (replace) {
    const [a, b] = await Promise.all([
      supabase.from("character_art").delete().in("artwork_id", artworkIds),
      supabase.from("collection_art").delete().in("artwork_id", artworkIds),
    ]);
    if (a.error || b.error) return false;
  }
  const characterRows = artworkIds.flatMap((artwork_id) =>
    where.characters.map((c) => ({ character_id: c.id, artwork_id, section: c.section })),
  );
  const collectionRows = artworkIds.flatMap((artwork_id) =>
    where.collections.map((collection_id) => ({ collection_id, artwork_id })),
  );
  const [a, b] = await Promise.all([
    characterRows.length ? supabase.from("character_art").insert(characterRows) : { error: null },
    collectionRows.length ? supabase.from("collection_art").insert(collectionRows) : { error: null },
  ]);
  return !a.error && !b.error;
}

// Pieces -----------------------------------------------------------------------

export async function addArtworks(handle: string, input: unknown): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only add art to your own gallery.");
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { items, kind, client, description, tags, characters, collections } = parsed.data;

  // Each picture must be the artist's, really there, and really an image (verify.ts).
  const checked = await verifyUploads(items, { userId: viewer.id, folder: "gallery" });
  if (!checked.ok) return checked;
  const images = checked.images;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("artworks")
    .insert(
      items.map((item, i) => ({
        title: item.title,
        description,
        kind,
        client: kind === "commission" ? client : null,
        tags,
        image: images[i],
      })),
    )
    .select("id");
  if (error || !data) return fail(error?.message.includes("2000") ? "A gallery holds up to 2000 pieces." : "Couldn't add your art. Try again in a moment.");

  const ids = data.map((row) => row.id as string);
  const placed = await place(supabase, ids, { characters, collections }, false);
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return placed
    ? { ok: true, ids }
    : { ok: true, ids, warning: "Added, but not to every character or collection. Edit a piece to try again." };
}

export async function updateArtwork(handle: string, id: string, input: unknown): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only edit your own art.");
  if (!z.uuid().safeParse(id).success) return fail("That piece isn't there anymore.");
  const parsed = details.extend(placement.shape).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { characters, collections, ...fields } = parsed.data;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("artworks")
    .update({ ...fields, client: fields.kind === "commission" ? fields.client : null })
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return fail("Couldn't save that piece. Try again in a moment.");

  const placed = await place(supabase, [id], { characters, collections }, true);
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return placed ? { ok: true } : { ok: true, warning: "Saved, but not on every character or collection." };
}

export async function deleteArtwork(handle: string, id: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only delete your own art.");
  if (!z.uuid().safeParse(id).success) return fail("That piece isn't there anymore.");

  const supabase = await createSupabaseServer();
  // Takes it off its characters and collections too (on delete cascade).
  const { data, error } = await supabase
    .from("artworks")
    .delete()
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("image")
    .maybeSingle<{ image: StoredImage }>();
  if (error || !data) return fail("Couldn't delete that piece.");
  await removeFiles([data.image]);

  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true };
}

// Characters -------------------------------------------------------------------

const characterSchema = z.object({
  name: text(LIMITS.name).min(1, "Give them a name."),
  tagline: text(LIMITS.tagline),
  species: text(LIMITS.species),
  pronouns: text(LIMITS.pronouns),
  story: text(LIMITS.story),
  traits: list(LIMITS.traits, LIMITS.trait),
  tags: list(LIMITS.tags, LIMITS.tag),
  palette: z
    .array(z.string().regex(/^#[0-9a-f]{6}$/i, "Colors are #rrggbb."))
    .max(LIMITS.palette)
    .transform((colors) => [...new Set(colors.map((c) => c.toLowerCase()))]),
  designer: text(LIMITS.designer).transform((v) => v || null),
  coverId: z.uuid().nullable(),
  adoptableId: z.uuid().nullable(),
});

const fieldsOf = (c: z.infer<typeof characterSchema>) => ({
  name: c.name,
  tagline: c.tagline,
  species: c.species,
  pronouns: c.pronouns,
  story: c.story,
  traits: c.traits,
  tags: c.tags,
  palette: c.palette,
  designer: c.designer,
  cover_artwork_id: c.coverId,
  adoptable_id: c.adoptableId,
});

/** Slugs already used by the artist's other characters (or collections). */
async function slugsTaken(supabase: Supabase, table: "characters" | "collections", ownerId: string, except: string | null) {
  const { data } = await supabase.from(table).select("id, slug").eq("owner_id", ownerId);
  return (data ?? []).filter((row) => row.id !== except).map((row) => row.slug as string);
}

/** Creates a character (`id` null) or saves one. The page's address follows the name. */
export async function saveCharacter(handle: string, id: string | null, input: unknown): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only edit your own characters.");
  if (id !== null && !z.uuid().safeParse(id).success) return fail("That character isn't there anymore.");
  const parsed = characterSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServer();
  const slug = uniqueSlug(parsed.data.name, await slugsTaken(supabase, "characters", viewer.id, id), "character");
  const row = { ...fieldsOf(parsed.data), slug };
  const { data, error } = id
    ? await supabase.from("characters").update(row).eq("id", id).eq("owner_id", viewer.id).select("id").maybeSingle()
    : await supabase.from("characters").insert(row).select("id").single();
  if (error || !data) {
    if (error?.message.includes("100 characters")) return fail("You can keep up to 100 characters.");
    if (error?.code === "42501") return fail("The cover and the adoptable must be yours.");
    return fail("Couldn't save your character. Try again in a moment.");
  }

  // The cover is on the character too (as their design, when it wasn't on them yet).
  if (parsed.data.coverId) {
    await supabase
      .from("character_art")
      .upsert({ character_id: data.id, artwork_id: parsed.data.coverId, section: "design" }, { onConflict: "character_id,artwork_id", ignoreDuplicates: true });
  }
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true, href: characterHref(handle, slug), ids: [data.id as string] };
}

/** Deletes the character's page. Their art stays in the gallery. */
export async function deleteCharacter(handle: string, id: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only delete your own characters.");
  if (!z.uuid().safeParse(id).success) return fail("That character isn't there anymore.");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("characters").delete().eq("id", id).eq("owner_id", viewer.id).select("id").maybeSingle();
  if (error || !data) return fail("Couldn't delete that character.");
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true, href: `/${handle}/gallery` };
}

// Collections ------------------------------------------------------------------

const collectionSchema = z.object({
  title: text(LIMITS.collectionTitle).min(1, "Give it a title."),
  description: text(LIMITS.collectionDescription),
  coverId: z.uuid().nullable(),
});

export async function saveCollection(handle: string, id: string | null, input: unknown): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only edit your own collections.");
  if (id !== null && !z.uuid().safeParse(id).success) return fail("That collection isn't there anymore.");
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServer();
  const slug = uniqueSlug(parsed.data.title, await slugsTaken(supabase, "collections", viewer.id, id), "collection");
  const row = { title: parsed.data.title, description: parsed.data.description, cover_artwork_id: parsed.data.coverId, slug };
  const { data, error } = id
    ? await supabase.from("collections").update(row).eq("id", id).eq("owner_id", viewer.id).select("id").maybeSingle()
    : await supabase.from("collections").insert(row).select("id").single();
  if (error || !data) {
    if (error?.message.includes("100 collections")) return fail("You can keep up to 100 collections.");
    return fail("Couldn't save your collection. Try again in a moment.");
  }
  if (parsed.data.coverId) {
    await supabase
      .from("collection_art")
      .upsert({ collection_id: data.id, artwork_id: parsed.data.coverId }, { onConflict: "collection_id,artwork_id", ignoreDuplicates: true });
  }
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true, href: collectionHref(handle, slug), ids: [data.id as string] };
}

export async function deleteCollection(handle: string, id: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only delete your own collections.");
  if (!z.uuid().safeParse(id).success) return fail("That collection isn't there anymore.");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("collections").delete().eq("id", id).eq("owner_id", viewer.id).select("id").maybeSingle();
  if (error || !data) return fail("Couldn't delete that collection.");
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true, href: `/${handle}/gallery` };
}

// Arranging --------------------------------------------------------------------

/** Makes a piece the cover of a character or collection it's on. */
export async function setCover(handle: string, target: "character" | "collection", id: string, artworkId: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only arrange your own gallery.");
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(artworkId).success) return fail("That piece isn't there anymore.");
  const supabase = await createSupabaseServer();
  const table = target === "character" ? "characters" : "collections";
  const { data, error } = await supabase
    .from(table)
    .update({ cover_artwork_id: artworkId })
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return fail("Couldn't change the cover.");
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true };
}

/** Moves a piece to another section of a character's page. */
export async function moveToSection(handle: string, characterId: string, artworkId: string, section: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only arrange your own characters.");
  const parsed = z.enum(SECTION_IDS).safeParse(section);
  if (!parsed.success || !z.uuid().safeParse(characterId).success || !z.uuid().safeParse(artworkId).success) {
    return fail("That piece isn't there anymore.");
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("character_art")
    .update({ section: parsed.data })
    .eq("character_id", characterId)
    .eq("artwork_id", artworkId)
    .select("artwork_id")
    .maybeSingle();
  if (error || !data) return fail("Couldn't move that piece.");
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true };
}

/** Takes a piece off a character or out of a collection (it stays in the gallery). */
export async function removeFrom(handle: string, target: "character" | "collection", id: string, artworkId: string): Promise<GalleryResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return fail("You can only arrange your own gallery.");
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(artworkId).success) return fail("That piece isn't there anymore.");
  const supabase = await createSupabaseServer();
  const { error } =
    target === "character"
      ? await supabase.from("character_art").delete().eq("character_id", id).eq("artwork_id", artworkId)
      : await supabase.from("collection_art").delete().eq("collection_id", id).eq("artwork_id", artworkId);
  if (error) return fail("Couldn't take it off.");
  updateTag(galleryTag(handle));
  updateTag(WALL_TAG);
  return { ok: true };
}
