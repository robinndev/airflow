"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { ART_BUCKET, artUrl, isOwnArtPath, type ArtFolder } from "@/lib/art-storage";
import { db } from "@/lib/profile/mock-db";
import { FEED_TAG, postsTag, profileTag } from "@/lib/profile/queries";
import { getViewer, PREVIEW_AS_VISITOR_COOKIE } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_POST_LENGTH = 2000;

/** An image already uploaded to the `art` bucket by the browser (see src/lib/images/prepare.ts). */
const uploadedImage = z.object({
  path: z.string().max(200),
  width: z.coerce.number().int().min(1).max(8192),
  height: z.coerce.number().int().min(1).max(8192),
  palette: z
    .string()
    .regex(/^(#[0-9a-f]{6}(,#[0-9a-f]{6}){0,7})?$/i, "Unsupported image.")
    .transform((value) => (value ? value.toLowerCase().split(",") : [])),
});

const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(MAX_POST_LENGTH, `Posts can be up to ${MAX_POST_LENGTH} characters.`),
  kind: z.enum(["finished", "wip", "sketch", "update"]),
});

/** The signed-in owner of `handle`, or null. */
async function ownerOf(handle: string) {
  const viewer = await getViewer();
  return viewer?.handle === handle ? viewer : null;
}

/** The upload must be this user's, in the right folder, and actually there. */
async function checkUpload(path: string, userId: string, folder: ArtFolder) {
  if (!isOwnArtPath(path, userId, folder)) return false;
  const res = await fetch(artUrl(path), { method: "HEAD", cache: "no-store" }).catch(() => null);
  return res?.ok ?? false;
}

export async function createPost(
  handle: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return { ok: false, error: "You can only post on your own profile." };

  const parsed = postSchema.safeParse({ body: formData.get("body"), kind: formData.get("kind") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  let image: z.infer<typeof uploadedImage> | null = null;
  if (formData.get("imagePath")) {
    const result = uploadedImage.safeParse({
      path: formData.get("imagePath"),
      width: formData.get("imageWidth"),
      height: formData.get("imageHeight"),
      palette: formData.get("imagePalette") ?? "",
    });
    if (!result.success || !(await checkUpload(result.data.path, viewer.id, "posts"))) {
      return { ok: false, error: "That image didn't upload. Try adding it again." };
    }
    image = result.data;
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("posts").insert({
    author_id: viewer.id,
    kind: parsed.data.kind,
    body: parsed.data.body,
    image_path: image?.path ?? null,
    image_width: image?.width ?? null,
    image_height: image?.height ?? null,
    image_palette: image?.palette ?? null,
  });
  if (error) return { ok: false, error: "Couldn't publish your post. Try again in a moment." };

  updateTag(postsTag(handle));
  updateTag(FEED_TAG);
  return { ok: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to manage your posts." };
  if (!z.uuid().safeParse(postId).success) return { ok: false, error: "That post doesn't exist." };

  const supabase = await createSupabaseServer();
  // Row level security only lets authors delete their own posts.
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", viewer.id)
    .select("image_path")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't delete that post." };
  if (data.image_path) await supabase.storage.from(ART_BUCKET).remove([data.image_path]);

  updateTag(postsTag(viewer.handle));
  updateTag(FEED_TAG);
  return { ok: true };
}

export async function updateProfileImage(
  handle: string,
  slot: "avatar" | "banner",
  input: { path: string; width: number; height: number; palette: string[] },
): Promise<ActionResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return { ok: false, error: "You can only edit your own profile." };

  const image = uploadedImage.safeParse({ ...input, palette: input.palette.join(",") });
  if (!image.success || !(await checkUpload(image.data.path, viewer.id, slot))) {
    return { ok: false, error: "That image didn't upload. Try again." };
  }

  const supabase = await createSupabaseServer();
  const { data: before } = await supabase.from("profiles").select(`${slot}, plan`).eq("id", viewer.id).single();
  // The database enforces this too (profiles_enforce_media).
  if (image.data.path.endsWith(".gif") && (before as { plan?: string } | null)?.plan !== "flow_plus") {
    return { ok: false, error: "Animated GIFs come with Flow+." };
  }
  const { error } = await supabase.from("profiles").update({ [slot]: image.data }).eq("id", viewer.id);
  if (error) return { ok: false, error: "Couldn't save that image. Try again." };

  // The previous upload is no longer used anywhere.
  const previous = (before as Record<string, { path?: string } | null> | null)?.[slot]?.path;
  if (previous && previous !== image.data.path) await supabase.storage.from(ART_BUCKET).remove([previous]);

  updateTag(profileTag(handle));
  updateTag(FEED_TAG); // Feed cards embed the author's avatar.
  return { ok: true };
}

const requestSchema = z.object({
  serviceId: z.string().min(1, "Choose what you'd like to request."),
  description: z
    .string()
    .trim()
    .min(20, "Tell the artist a bit more — at least 20 characters.")
    .max(2000, "Keep it under 2,000 characters."),
  usage: z.enum(["personal", "commercial"]),
  budget: z.enum(["under-50", "50-150", "150-300", "300-plus"]).optional(),
  deadline: z.iso.date().optional(),
  references: z.string().trim().max(1000).optional(),
  acceptedTerms: z.literal("on", { error: "Please accept the artist's terms first." }),
});

export async function submitCommissionRequest(
  handle: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const optional = (key: string) => formData.get(key) || undefined;
  const parsed = requestSchema.safeParse({
    serviceId: formData.get("serviceId"),
    description: formData.get("description"),
    usage: formData.get("usage"),
    budget: optional("budget"),
    deadline: optional("deadline"),
    references: optional("references"),
    acceptedTerms: formData.get("acceptedTerms"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { serviceId } = parsed.data;
  if (
    serviceId !== "custom" &&
    !db.services.some((s) => s.id === serviceId && s.ownerHandle === handle)
  ) {
    return { ok: false, error: "That service is no longer available." };
  }

  const viewer = await getViewer();
  db.requests.push({
    id: `req_${crypto.randomUUID()}`,
    artistHandle: handle,
    requesterHandle: viewer?.handle ?? null,
    ...parsed.data,
    acceptedTerms: true,
    createdAt: new Date().toISOString(),
  });

  return { ok: true };
}

export async function setPreviewAsVisitor(enabled: boolean) {
  const store = await cookies();
  if (enabled) {
    store.set(PREVIEW_AS_VISITOR_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    store.delete(PREVIEW_AS_VISITOR_COOKIE);
  }
}
