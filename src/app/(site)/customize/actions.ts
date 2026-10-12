"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { ART_BUCKET, artUrl, isOwnArtPath } from "@/lib/art-storage";
import { boardPaidFeatures, boardSchema, type Board } from "@/lib/customization/about";
import { checkCustomCss } from "@/lib/customization/css";
import { FREE, PAID_ABOUT_BLOCKS, customizationSchema, paidFieldsUsed, type Customization } from "@/lib/customization/model";
import { fetchOwnedFrames } from "@/lib/customization/queries";
import { frameById, isFreeFrame } from "@/lib/frames";
import { fetchPlanForUser } from "@/lib/profile/accounts";
import { cleanDraws } from "@/lib/profile/draws";
import { MAX_LINKS, normalizeUrl } from "@/lib/profile/links";
import { FEED_TAG, profileTag } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Customizer and shop actions. `profiles.customization/about` have no column
 * grants, so this file is the only way in: it checks the session, validates
 * the documents, sanitizes custom CSS, enforces the plan and frame ownership,
 * then writes with the secret key for exactly this user's row.
 */

export type SaveResult = { ok: true } | { ok: false; error: string; needsPlan?: string[] };

const listOf = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export async function saveCustomization(input: { customization: unknown; board: unknown }): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to customize your profile." };

  const parsedCustom = customizationSchema.safeParse(input.customization);
  const parsedBoard = boardSchema.safeParse(input.board);
  if (!parsedCustom.success) return { ok: false, error: `Something in your design is off: ${parsedCustom.error.issues[0].message}` };
  if (!parsedBoard.success) return { ok: false, error: `Something on your About board is off: ${parsedBoard.error.issues[0].message}` };

  const customization: Customization = parsedCustom.data;
  const board: Board = parsedBoard.data;
  const paid = (await fetchPlanForUser(viewer.id)) === "flow_plus";

  // Try-before-you-buy: anyone can preview everything, only Flow+ can publish paid options.
  if (!paid) {
    const needs = [...paidFieldsUsed(customization), ...boardPaidFeatures(board, FREE.aboutBlocks)];
    if (needs.length > 0) {
      return { ok: false, needsPlan: needs, error: `${listOf(needs)} ${needs.length === 1 ? "is" : "are"} part of Flow+.` };
    }
  }
  if (board.blocks.length > PAID_ABOUT_BLOCKS) return { ok: false, error: `Boards hold up to ${PAID_ABOUT_BLOCKS} blocks.` };

  if (customization.css) {
    const css = checkCustomCss(customization.css, artUrl("").replace(/\/$/, ""));
    if (!css.ok) return { ok: false, error: css.error };
    customization.css = css.css || undefined;
  }

  // Uploaded images must be this account's own files.
  const images = [
    ...board.blocks.flatMap((b) => (b.type === "image" ? [b.image.path] : [])),
    ...(customization.background.image ? [customization.background.image.path] : []),
  ];
  if (images.some((path) => !isOwnArtPath(path, viewer.id, "about"))) {
    return { ok: false, error: "One of the images isn't yours. Upload it again from the board." };
  }

  if (customization.frame) {
    if (!frameById(customization.frame)) return { ok: false, error: "That frame doesn't exist anymore." };
    if (!isFreeFrame(customization.frame) && !(await fetchOwnedFrames(viewer.id)).includes(customization.frame)) {
      return { ok: false, error: "Get that frame in the shop before wearing it." };
    }
  }

  const admin = createSupabaseAdmin();
  const { data: before } = await admin.from("profiles").select("customization, about").eq("id", viewer.id).single();
  const { error } = await admin.from("profiles").update({ customization, about: board }).eq("id", viewer.id);
  // 42703: this database hasn't had the customization migration applied yet.
  if (error?.code === "42703") return { ok: false, error: "Customization isn't switched on for this database yet (pending migration)." };
  if (error) return { ok: false, error: "Couldn't save your design. Try again in a moment." };

  // Images that were removed from the board (or the background) aren't used anywhere else.
  const stillUsed = new Set(images);
  const oldBackground = (before?.customization as Customization | null)?.background?.image?.path;
  const previous = [
    ...((before?.about as Board | null)?.blocks ?? []).flatMap((b) => (b.type === "image" ? [b.image.path] : [])),
    ...(oldBackground ? [oldBackground] : []),
  ].filter((path) => typeof path === "string" && !stillUsed.has(path) && isOwnArtPath(path, viewer.id, "about"));
  if (previous.length > 0) await admin.storage.from(ART_BUCKET).remove(previous);

  updateTag(profileTag(viewer.handle));
  return { ok: true };
}

/** Free frames: claim once, keep forever. Paid frames arrive with checkout. */
export async function claimFrame(frameId: string): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to collect frames." };
  if (!frameById(frameId)) return { ok: false, error: "That frame doesn't exist." };
  if (!isFreeFrame(frameId)) return { ok: false, error: "Checkout for paid frames opens soon." };

  const { error } = await createSupabaseAdmin()
    .from("owned_frames")
    .upsert({ user_id: viewer.id, frame_id: frameId, source: "claim" }, { onConflict: "user_id,frame_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Couldn't add that frame. Try again." };
  return { ok: true };
}

/** Wear a frame you own (or a free one), or take it off with null. */
export async function equipFrame(frameId: string | null): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to wear frames." };
  if (frameId !== null) {
    if (!frameById(frameId)) return { ok: false, error: "That frame doesn't exist." };
    const owned = await fetchOwnedFrames(viewer.id);
    if (!isFreeFrame(frameId) && !owned.includes(frameId)) return { ok: false, error: "Get that frame first." };
    if (isFreeFrame(frameId) && !owned.includes(frameId)) {
      const claimed = await claimFrame(frameId);
      if (!claimed.ok) return claimed;
    }
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("customization").eq("id", viewer.id).single();
  const current = customizationSchema.safeParse(data?.customization ?? {});
  const next = { ...(current.success ? current.data : customizationSchema.parse({})), frame: frameId ?? undefined };
  const { error } = await admin.from("profiles").update({ customization: next }).eq("id", viewer.id);
  if (error) return { ok: false, error: "Couldn't put that frame on. Try again." };

  updateTag(profileTag(viewer.handle));
  return { ok: true };
}

/* ------------------------------------------------------------ edit profile */

const detailsSchema = z.object({
  displayName: z.string().trim().min(1, "Your name can't be empty.").max(50, "Keep your name under 50 characters."),
  headline: z.string().trim().max(80, "Keep the headline under 80 characters."),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters."),
  pronouns: z.string().trim().max(24, "Keep pronouns under 24 characters."),
  location: z.string().trim().max(40, "Keep the location under 40 characters."),
  links: z
    .array(z.object({ url: z.string().max(300), label: z.string().trim().max(40).optional() }))
    .max(MAX_LINKS, `Up to ${MAX_LINKS} links.`),
  draws: z.array(z.string()).max(20).transform(cleanDraws),
});

export type ProfileDetails = z.infer<typeof detailsSchema>;
export type DetailsResult = { ok: true } | { ok: false; error: string; field?: keyof ProfileDetails };

/**
 * "Edit profile": name, headline, bio, pronouns, location, links and what
 * they draw. Written
 * as the signed-in user (column grants + the "Owners can update their
 * profile" policy), so the database itself limits it to their own row.
 */
export async function updateProfileDetails(input: ProfileDetails): Promise<DetailsResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to edit your profile." };

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path[0] as keyof ProfileDetails };
  }

  const links: { url: string; label?: string }[] = [];
  for (const link of parsed.data.links) {
    if (!link.url.trim()) continue;
    const url = normalizeUrl(link.url);
    if (!url) return { ok: false, error: `“${link.url}” isn't a web address.`, field: "links" };
    if (links.some((l) => l.url === url)) continue; // same link twice
    links.push(link.label ? { url, label: link.label } : { url });
  }

  const { displayName, headline, bio, pronouns, location, draws } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, headline, bio, pronouns, location, links, draws })
    .eq("id", viewer.id);
  if (error) {
    // Surfaces in the server terminal, so a failed save is never a mystery.
    console.error("[updateProfileDetails]", error.code, error.message, error.details);
    if (error.code === "42703") return { ok: false, error: "Profile details aren't switched on for this database yet (pending migration)." };
    if (error.code === "23514") return { ok: false, error: "One of the fields is too long or not allowed." };
    if (error.code === "42501") return { ok: false, error: "The database refused this edit (missing permission). Tell the team." };
    return { ok: false, error: `Couldn't save your profile (${error.code ?? "unknown"}). Try again in a moment.` };
  }

  updateTag(profileTag(viewer.handle));
  updateTag(FEED_TAG); // Feed cards show the author's name.
  return { ok: true };
}
