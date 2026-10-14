"use server";

import { optionUsd, pickOptions, serviceOptions, usageOf } from "@/lib/commissions/addons";
import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { StoredImage } from "@/lib/art-storage";
import { variantFields } from "@/lib/images/schema";
import { removeFiles, verifyUploads } from "@/lib/images/verify";
import { fetchPostInfo, postRef } from "@/lib/profile/conversation";
import { db } from "@/lib/profile/mock-db";
import { fetchServicesByHandle } from "@/lib/listings/server";
import { FEED_TAG, LISTINGS_TAG, postsTag, profileTag, servicesTag } from "@/lib/profile/queries";
import { getViewer, PREVIEW_AS_VISITOR_COOKIE } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_POST_LENGTH = 2000;

/** An image already uploaded to the `art` bucket by the browser (see src/lib/images/prepare.ts), with its thumb and original. */
const uploadedImage = z.object({
  path: z.string().max(200),
  width: z.number().int().min(1).max(8192),
  height: z.number().int().min(1).max(8192),
  palette: z
    .array(z.string().regex(/^#[0-9a-f]{6}$/i))
    .max(8)
    .transform((colors) => colors.map((c) => c.toLowerCase())),
  ...variantFields,
});

/** The composer's images, as JSON: up to four uploads. */
const uploadedImages = z.array(uploadedImage).max(4, "A post holds up to four images.");

/** Forms submit line breaks as CRLF; store plain newlines. */
const lines = (text: string) => text.replace(/\r\n?/g, "\n");

const postSchema = z.object({
  body: z
    .string()
    .overwrite(lines)
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

export async function createPost(
  handle: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return { ok: false, error: "You can only post on your own profile." };

  const parsed = postSchema.safeParse({ body: formData.get("body"), kind: formData.get("kind") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  let claimed: z.infer<typeof uploadedImages> = [];
  try {
    const result = uploadedImages.safeParse(JSON.parse(String(formData.get("images") ?? "[]")));
    if (!result.success) return { ok: false, error: result.error.issues[0].message };
    claimed = result.data;
  } catch {
    return { ok: false, error: "Those images didn't upload. Try adding them again." };
  }
  const checked = await verifyUploads(claimed, { userId: viewer.id, folder: "posts" });
  if (!checked.ok) return checked;
  const images = checked.images;

  const [first] = images;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("posts").insert({
    author_id: viewer.id,
    kind: parsed.data.kind,
    body: parsed.data.body,
    images,
    // Older deployments read only these: keep them on the first image until they're dropped.
    image_path: first?.path ?? null,
    image_width: first?.width ?? null,
    image_height: first?.height ?? null,
    image_palette: first?.palette ?? null,
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
    .select("image_path, images")
    .maybeSingle<{ image_path: string | null; images: StoredImage[] | null }>();
  if (error || !data) return { ok: false, error: "Couldn't delete that post." };
  const images = data.images ?? [];
  const legacy = data.image_path && !images.some((image) => image.path === data.image_path);
  // Its pictures go with it: display copies, thumbs and originals.
  await removeFiles([...images, ...(legacy ? [{ path: data.image_path!, width: 1, height: 1 }] : [])]);

  updateTag(postsTag(viewer.handle));
  updateTag(FEED_TAG);
  return { ok: true };
}

/**
 * Pins someone's post to yours, with an optional note. Reposting a repost
 * pins its original instead (a polaroid of a polaroid shows nothing new).
 */
export async function repostPost(postId: string, note: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to repost." };
  const body = lines(note).trim();
  if (body.length > MAX_POST_LENGTH) return { ok: false, error: `Notes can be up to ${MAX_POST_LENGTH} characters.` };

  let info = await fetchPostInfo(postId);
  let target = postId;
  if (info?.quotePostId) {
    target = info.quotePostId;
    info = await fetchPostInfo(target);
  }
  const ref = info && postRef(target);
  if (!info || !ref) return { ok: false, error: "That post isn't there anymore." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("posts").insert({
    author_id: viewer.id,
    kind: "update",
    body,
    ...("post_id" in ref ? { quote_post_id: ref.post_id } : { quote_demo_post_id: ref.demo_post_id }),
  });
  if (error) return { ok: false, error: "Couldn't repost that. Try again in a moment." };

  updateTag(FEED_TAG);
  updateTag(postsTag(viewer.handle));
  updateTag(postsTag(info.authorHandle)); // Its repost count.
  return { ok: true };
}

export async function updateProfileImage(
  handle: string,
  slot: "avatar" | "banner",
  input: StoredImage,
): Promise<ActionResult> {
  const viewer = await ownerOf(handle);
  if (!viewer) return { ok: false, error: "You can only edit your own profile." };

  const parsed = uploadedImage.safeParse({ ...input, palette: input.palette ?? [] });
  if (!parsed.success) return { ok: false, error: "That image didn't upload. Try again." };
  const checked = await verifyUploads([parsed.data], { userId: viewer.id, folder: slot });
  if (!checked.ok) return checked;
  const [image] = checked.images;

  const supabase = await createSupabaseServer();
  const { data: before } = await supabase.from("profiles").select(`${slot}, plan`).eq("id", viewer.id).single();
  // The database enforces this too (profiles_enforce_media).
  if (image.path.endsWith(".gif") && (before as { plan?: string } | null)?.plan !== "flow_plus") {
    return { ok: false, error: "Animated GIFs come with Flow+." };
  }
  const { error } = await supabase.from("profiles").update({ [slot]: image }).eq("id", viewer.id);
  if (error) return { ok: false, error: "Couldn't save that image. Try again." };

  // The previous upload (and its thumb) is no longer used anywhere.
  const previous = (before as Record<string, StoredImage | null> | null)?.[slot];
  if (previous?.path && previous.path !== image.path) await removeFiles([previous]);

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
  // Asked on custom pieces only; a service's usage comes from its licenses.
  usage: z.enum(["personal", "commercial"]).optional(),
  budget: z.enum(["under-50", "50-150", "150-300", "300-plus"]).optional(),
  deadline: z.iso.date().optional(),
  references: z.string().trim().max(1000).optional(),
  acceptedTerms: z.literal("on", { error: "Please accept the artist's terms first." }),
});

/** A sent request says whether it joined the waitlist (it can take the last slot and tip the service over). */
export type RequestSent = { ok: true; waitlisted: boolean } | { ok: false; error: string };

export async function submitCommissionRequest(
  handle: string,
  _prev: RequestSent | null,
  formData: FormData,
): Promise<RequestSent> {
  const optional = (key: string) => formData.get(key) || undefined;
  const parsed = requestSchema.safeParse({
    serviceId: formData.get("serviceId"),
    description: formData.get("description"),
    usage: optional("usage"),
    budget: optional("budget"),
    deadline: optional("deadline"),
    references: optional("references"),
    acceptedTerms: formData.get("acceptedTerms"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { serviceId } = parsed.data;
  const isDemo = db.profiles.some((p) => p.handle === handle);
  const service = isDemo
    ? db.services.find((s) => s.id === serviceId && s.ownerHandle === handle)
    : serviceId === "custom"
      ? undefined
      : (await fetchServicesByHandle(handle)).find((s) => s.id === serviceId);
  if (serviceId !== "custom" && !service) {
    return { ok: false, error: "That service is no longer available." };
  }
  // The package they picked, then only what this service sells on top, priced
  // as it is now (the request keeps that snapshot). Percentages apply to the package.
  const packageId = formData.get("packageId");
  const chosen = service?.packages?.find((p) => p.id === packageId) ?? service?.packages?.[0];
  const base = chosen?.priceUsd ?? service?.priceFromUsd ?? 0;
  const ids = formData.getAll("addonIds").filter((value): value is string => typeof value === "string");
  const picked = service ? pickOptions(serviceOptions(service), ids) : [];
  const addons = picked.map(({ id, label, price }) => ({ id, label, priceUsd: optionUsd(price, base) }));
  const usage = service ? usageOf(service.usage, ids) : (parsed.data.usage ?? "personal");
  const pkg = chosen && { id: chosen.id, label: chosen.label, priceUsd: chosen.priceUsd };

  // Every request is stored, so it shows on the buyer's /requests for real.
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to send a request, so the artist can answer you." };
  if (viewer.handle === handle) return { ok: false, error: "That's your own service." };
  const admin = createSupabaseAdmin();
  const { data: artist } = isDemo
    ? { data: null }
    : await admin.from("profiles").select("*").eq("handle", handle).maybeSingle<{ id: string; artist_since?: string | null }>();
  if (!isDemo && !artist) return { ok: false, error: "That artist doesn't exist anymore." };
  // Only artists (artist access, from an artist code) take commissions; `undefined` is a database without the column.
  if (artist?.artist_since === null) return { ok: false, error: `@${handle} doesn't take commissions on Artiflow.` };

  const { data: sent, error } = await admin.from("commission_requests").insert({
    buyer_id: viewer.id,
    // Real artists by id (the request takes a slot, see the listings migration); demo artists by handle.
    ...(isDemo ? { demo_artist: handle, demo_service_id: service?.id ?? null } : { artist_id: artist!.id, service_id: service?.id ?? null }),
    service_title: service?.title ?? "Custom piece",
    package: pkg ?? null,
    addons,
    estimate_usd: service ? base + addons.reduce((sum, addon) => sum + addon.priceUsd, 0) : null,
    description: parsed.data.description,
    reference_links: parsed.data.references ?? null,
    deadline: parsed.data.deadline ?? null,
    usage,
    budget: service ? null : (parsed.data.budget ?? null),
  }).select("id, status").single();
  if (error?.code === "23505") return { ok: false, error: "You already have a request waiting on this service." };
  // The database's own messages: closed, full, daily limit.
  if (error?.code === "23514" || error?.code === "P0002") return { ok: false, error: error.message };
  if (error) return { ok: false, error: "Couldn't send your request. Try again in a moment." };

  // A demo artist on a waitlist queues it there (they have no services in the database to say so).
  if (isDemo && db.profiles.find((p) => p.handle === handle)?.commissions.status === "waitlist") {
    await admin.from("commission_requests").update({ status: "waitlisted" }).eq("id", sent!.id);
    return { ok: true, waitlisted: true };
  }
  if (isDemo) return { ok: true, waitlisted: false };

  updateTag(servicesTag(handle)); // Slots and maybe status.
  updateTag(profileTag(handle));
  updateTag(LISTINGS_TAG);
  updateTag("explore");
  updateTag("search-index");
  return { ok: true, waitlisted: sent?.status === "waitlisted" };
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
