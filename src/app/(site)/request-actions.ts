"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { isOwnArtPath } from "@/lib/art-storage";
import { LISTINGS_TAG, profileTag, servicesTag } from "@/lib/profile/queries";
import { getViewer, type Viewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * A real commission, step by step (see the *_commission_orders.sql
 * migration). Requests have no write grants: these actions check who's asking
 * and that the step is allowed from where the order stands, then write with
 * the secret key. Database triggers give slots back (decline, cancel, expiry,
 * waitlist) and notify the other side.
 *
 *   artist: quote, waitlist, decline · start, step, deliver · pause, archive, note
 *   buyer:  take a request back, or decline a quote
 *   team:   mark paid (`npm run orders`), until checkout exists
 */

export type RequestResult = { ok: true } | { ok: false; error: string };

type Status = "pending" | "waitlisted" | "quoted" | "paid" | "in_progress" | "delivered" | "declined" | "cancelled" | "expired";

const STEPS = ["sketch", "lineart", "flats", "render"] as const;
const DAY = 86_400_000;

/** Slots and the service's status may have moved: refresh the artist's listings everywhere. */
async function refreshListings(artistId: string) {
  const { data } = await createSupabaseAdmin().from("profiles").select("handle").eq("id", artistId).maybeSingle();
  if (!data) return;
  updateTag(servicesTag(data.handle));
  updateTag(profileTag(data.handle));
  updateTag(LISTINGS_TAG);
  updateTag("explore");
  updateTag("search-index");
}

/**
 * Moves one order the viewer is part of, if it stands where `from` allows.
 * `as` says which side the viewer must be on.
 */
async function advance(
  id: string,
  as: "artist" | "buyer",
  from: Status[],
  change: Record<string, unknown>,
  { listings = false }: { listings?: boolean } = {},
): Promise<RequestResult & { viewer?: Viewer }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to manage your commissions." };
  const { data, error } = await createSupabaseAdmin()
    .from("commission_requests")
    .update(change)
    .eq("id", id)
    .eq(as === "artist" ? "artist_id" : "buyer_id", viewer.id)
    .in("status", from)
    .select("artist_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't save that. Try again in a moment." };
  if (!data) return { ok: false, error: "This order already moved on. Refresh to see where it stands." };
  if (listings) await refreshListings(data.artist_id);
  return { ok: true, viewer };
}

const done = ({ ok, ...rest }: RequestResult & { viewer?: Viewer }): RequestResult =>
  ok ? { ok: true } : { ok: false, error: (rest as { error: string }).error };

/* ------------------------------------------------------------- the artist */

const quoteSchema = z.object({
  priceUsd: z.number().min(1, "Quotes start at $1.").max(10_000, "Quotes go up to $10,000.").transform((n) => Math.round(n * 100) / 100),
  dueDate: z.iso.date({ error: "Pick the delivery date." }),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters."),
  expiresInDays: z.number().int().min(1).max(14),
});

/** The artist's yes: a final price, a delivery date and a note. The buyer has a few days to pay. */
export async function quoteRequest(id: string, input: z.input<typeof quoteSchema>): Promise<RequestResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { priceUsd, dueDate, note, expiresInDays } = parsed.data;
  const now = Date.now();
  if (new Date(`${dueDate}T23:59:59Z`).getTime() < now) return { ok: false, error: "The delivery date has to be in the future." };
  return done(
    await advance(id, "artist", ["pending", "waitlisted"], {
      status: "quoted",
      quote_usd: priceUsd,
      due_date: dueDate,
      quote_note: note || null,
      quoted_at: new Date(now).toISOString(),
      quote_expires_at: new Date(now + expiresInDays * DAY).toISOString(),
    }),
  );
}

/** Later: no date yet, nothing to pay, and the slot goes back to the service. */
export async function waitlistRequest(id: string): Promise<RequestResult> {
  return done(await advance(id, "artist", ["pending"], { status: "waitlisted" }, { listings: true }));
}

export async function declineRequest(id: string, note = ""): Promise<RequestResult> {
  const answer = note.trim().slice(0, 500);
  return done(
    await advance(id, "artist", ["pending", "waitlisted", "quoted"], { status: "declined", answer_note: answer || null }, { listings: true }),
  );
}

/** Paid and waiting its turn → on the easel, at the sketch. */
export async function startOrder(id: string): Promise<RequestResult> {
  return done(await advance(id, "artist", ["paid"], { status: "in_progress", step: "sketch", started_at: new Date().toISOString(), paused: false }));
}

export async function setOrderStep(id: string, step: (typeof STEPS)[number]): Promise<RequestResult> {
  if (!STEPS.includes(step)) return { ok: false, error: "Unknown step." };
  return done(await advance(id, "artist", ["in_progress"], { step }));
}

const deliverySchema = z.object({
  images: z
    .array(
      z.object({
        path: z.string().max(200),
        width: z.number().int().min(1).max(8192),
        height: z.number().int().min(1).max(8192),
        palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(8).optional(),
      }),
    )
    .min(1, "Add the finished piece.")
    .max(4, "Up to four files."),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters."),
});

/** The final files, with a note. The buyer sees them on their postcard. */
export async function deliverOrder(id: string, input: z.input<typeof deliverySchema>): Promise<RequestResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to manage your commissions." };
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.images.some((image) => !isOwnArtPath(image.path, viewer.id, "deliveries"))) {
    return { ok: false, error: "One of the files isn't yours. Upload it again." };
  }
  return done(
    await advance(id, "artist", ["in_progress"], {
      status: "delivered",
      step: "render",
      delivered_at: new Date().toISOString(),
      delivery: { images: parsed.data.images.map(({ palette, ...image }) => ({ ...image, palette: palette ?? [] })), ...(parsed.data.note && { note: parsed.data.note }) },
      paused: false,
    }),
  );
}

/** Pause (the order keeps its place) and archive (out of the way) are the artist's own bookkeeping. */
export async function setOrderFlags(id: string, flags: { paused?: boolean; archived?: boolean }): Promise<RequestResult> {
  const change: Record<string, boolean> = {};
  if (typeof flags.paused === "boolean") change.paused = flags.paused;
  if (typeof flags.archived === "boolean") change.archived_by_artist = flags.archived;
  if (Object.keys(change).length === 0) return { ok: true };
  const any: Status[] = ["pending", "waitlisted", "quoted", "paid", "in_progress", "delivered", "declined", "cancelled", "expired"];
  return done(await advance(id, "artist", any, change));
}

/** Private to the artist (the buyer can't read this column). */
export async function saveOrderNote(id: string, note: string): Promise<RequestResult> {
  const any: Status[] = ["pending", "waitlisted", "quoted", "paid", "in_progress", "delivered", "declined", "cancelled", "expired"];
  return done(await advance(id, "artist", any, { artist_note: note.trim().slice(0, 2000) || null }));
}

/* -------------------------------------------------------------- the buyer */

/** Takes back a request the artist hasn't answered, or declines a quote. The slot goes back. */
export async function cancelRequest(id: string): Promise<RequestResult> {
  return done(await advance(id, "buyer", ["pending", "waitlisted", "quoted"], { status: "cancelled" }, { listings: true }));
}
