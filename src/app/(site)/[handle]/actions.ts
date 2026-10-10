"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/profile/mock-db";
import { postsTag, profileTag } from "@/lib/profile/queries";
import { getViewer, PREVIEW_AS_VISITOR_COOKIE } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_POST_LENGTH = 2000;

const imageSchema = z.object({
  dataUrl: z
    .string()
    .max(950_000, "That image is too large.")
    .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Unsupported image."),
  width: z.coerce.number().int().min(1).max(4096),
  height: z.coerce.number().int().min(1).max(4096),
});

const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(MAX_POST_LENGTH, `Posts can be up to ${MAX_POST_LENGTH} characters.`),
  kind: z.enum(["finished", "wip", "sketch", "update"]),
});

async function assertOwner(handle: string) {
  const viewer = await getViewer();
  return viewer?.handle === handle;
}

export async function createPost(
  handle: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await assertOwner(handle))) {
    return { ok: false, error: "You can only post on your own profile." };
  }

  const parsed = postSchema.safeParse({
    body: formData.get("body"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const media = [];
  if (formData.get("imageDataUrl")) {
    const image = imageSchema.safeParse({
      dataUrl: formData.get("imageDataUrl"),
      width: formData.get("imageWidth"),
      height: formData.get("imageHeight"),
    });
    if (!image.success) {
      return { ok: false, error: image.error.issues[0].message };
    }
    media.push({
      src: image.data.dataUrl,
      alt: `Image shared by @${handle}`,
      width: image.data.width,
      height: image.data.height,
    });
  }

  db.posts.push({
    id: `pst_${crypto.randomUUID()}`,
    authorHandle: handle,
    kind: parsed.data.kind,
    body: parsed.data.body,
    media,
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: 0,
  });

  updateTag(postsTag(handle));
  return { ok: true };
}

export async function updateProfileImage(
  handle: string,
  slot: "avatar" | "banner",
  input: { dataUrl: string; width: number; height: number },
): Promise<ActionResult> {
  if (!(await assertOwner(handle))) {
    return { ok: false, error: "You can only edit your own profile." };
  }

  const image = imageSchema.safeParse(input);
  if (!image.success) {
    return { ok: false, error: image.error.issues[0].message };
  }

  const profile = db.profiles.find((p) => p.handle === handle);
  if (!profile) return { ok: false, error: "Profile not found." };

  profile[slot] = {
    src: image.data.dataUrl,
    alt: slot === "avatar" ? profile.displayName : `${profile.displayName}'s banner`,
    width: image.data.width,
    height: image.data.height,
  };

  updateTag(profileTag(handle));
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
