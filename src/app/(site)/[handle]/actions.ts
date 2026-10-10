"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/profile/mock-db";
import { FEED_TAG, postsTag, profileTag } from "@/lib/profile/queries";
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
  updateTag(FEED_TAG);
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
