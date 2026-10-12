"use server";

import { updateTag } from "next/cache";
import { ART_BUCKET, isOwnArtPath } from "@/lib/art-storage";
import { adoptableInput, serviceInput, type AdoptableInput, type ServiceInput } from "@/lib/listings/schema";
import { LISTINGS_TAG, adoptablesTag, profileTag, servicesTag } from "@/lib/profile/queries";
import { getViewer, type Viewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * The studio's writes: an artist's own services and adoptables. Everything
 * is validated here, then written as the artist under row level security
 * (the listings migration's triggers are the backstop). Every change
 * refreshes the artist's profile and discovery (search, Explore, trending).
 */

export type StudioResult = { ok: true; id?: string } | { ok: false; error: string };

type ServiceStatus = "open" | "waitlist" | "closed";
type AdoptStatus = "available" | "reserved" | "sold";

const SIGN_IN = { ok: false, error: "Sign in to manage your studio." } as const;
const NOT_MIGRATED = new Set(["42P01", "PGRST205"]);

function refresh(viewer: Viewer, what: "services" | "adoptables") {
  updateTag(what === "services" ? servicesTag(viewer.handle) : adoptablesTag(viewer.handle));
  updateTag(profileTag(viewer.handle));
  updateTag(LISTINGS_TAG);
  updateTag("explore");
  updateTag("search-index");
}

function failure(error: { code?: string; message: string } | null, fallback: string): StudioResult {
  if (error && NOT_MIGRATED.has(error.code ?? "")) {
    return { ok: false, error: "Listings aren't switched on for this database yet (pending migration)." };
  }
  // The triggers' own messages (limits, prices, images) are written for people.
  if (error?.code === "23514" || error?.code === "42501") return { ok: false, error: error.message };
  return { ok: false, error: fallback };
}

/** Files an edit stopped using, removed from the artist's folder (best effort). */
async function dropFiles(paths: string[]) {
  if (paths.length === 0) return;
  const supabase = await createSupabaseServer();
  await supabase.storage.from(ART_BUCKET).remove(paths).catch(() => {});
}

const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Something's missing.";

/* ---------------------------------------------------------------- services */

export async function saveService(input: ServiceInput): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const parsed = serviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const s = parsed.data;
  if (s.examples.some((image) => !isOwnArtPath(image.path, viewer.id, "listings"))) {
    return { ok: false, error: "One of the examples isn't yours. Upload it again." };
  }

  const row = {
    title: s.title,
    category: s.category,
    styles: s.styles,
    description: s.description,
    includes: s.includes,
    packages: s.packages.toSorted((a, b) => a.priceUsd - b.priceUsd),
    turnaround_min_days: s.turnaround.min,
    turnaround_max_days: s.turnaround.max,
    examples: s.examples.map(({ path, width, height, palette }) => ({ path, width, height, palette: palette ?? [] })),
    usage: s.usage,
    addons: s.addons,
    status: s.status,
    slots_total: s.slotsTotal,
    when_full: s.whenFull,
  };

  const supabase = await createSupabaseServer();
  if (!s.id) {
    const { data, error } = await supabase.from("services").insert(row).select("id").single();
    if (error || !data) return failure(error, "Couldn't list that service. Try again in a moment.");
    refresh(viewer, "services");
    return { ok: true, id: data.id };
  }

  const { data: before } = await supabase
    .from("services")
    .select("examples, status, slots_total, slots_taken")
    .eq("id", s.id)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "That service doesn't exist anymore." };

  // Saving a status by hand clears the "filled up" mark; raising the slots past what's taken does too.
  const statusChanged = before.status !== s.status;
  const roomAgain = s.slotsTotal === null || before.slots_taken < s.slotsTotal;
  const { error } = await supabase
    .from("services")
    .update({ ...row, ...((statusChanged || roomAgain) && { filled_at: null }), ...(statusChanged && { paused_status: null }) })
    .eq("id", s.id)
    .eq("owner_id", viewer.id);
  if (error) return failure(error, "Couldn't save your changes. Try again in a moment.");

  const kept = new Set(row.examples.map((image) => image.path));
  await dropFiles(((before.examples ?? []) as { path: string }[]).map((image) => image.path).filter((path) => !kept.has(path)));
  refresh(viewer, "services");
  return { ok: true, id: s.id };
}

export async function deleteService(id: string): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("examples")
    .maybeSingle();
  if (error) return failure(error, "Couldn't delete that service.");
  if (!data) return { ok: false, error: "That service doesn't exist anymore." };
  await dropFiles(((data.examples ?? []) as { path: string }[]).map((image) => image.path));
  refresh(viewer, "services");
  return { ok: true };
}

/** One click: Open, Waitlist or Closed. Requests already sent aren't affected. */
export async function setServiceStatus(id: string, status: ServiceStatus): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  if (!["open", "waitlist", "closed"].includes(status)) return { ok: false, error: "Unknown status." };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("services")
    .update({ status, filled_at: null, paused_status: null })
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("id")
    .maybeSingle();
  if (error) return failure(error, "Couldn't change the status.");
  if (!data) return { ok: false, error: "That service doesn't exist anymore." };
  refresh(viewer, "services");
  return { ok: true };
}

/**
 * Frees or takes a slot by hand (a request handled outside Artiflow, a slot
 * given back). A service that had filled up reopens once there's room.
 */
export async function adjustServiceSlots(id: string, delta: 1 | -1): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const supabase = await createSupabaseServer();
  const { data: s } = await supabase
    .from("services")
    .select("status, slots_total, slots_taken, when_full, filled_at")
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!s) return { ok: false, error: "That service doesn't exist anymore." };
  if (!s.slots_total) return { ok: false, error: "This service has no slot limit." };

  const taken = Math.min(s.slots_total, Math.max(0, s.slots_taken + delta));
  const full = taken >= s.slots_total;
  const reopen = !full && s.filled_at && s.status === s.when_full;
  const fill = full && s.status === "open";
  const { error } = await supabase
    .from("services")
    .update({
      slots_taken: taken,
      ...(reopen && { status: "open", filled_at: null }),
      ...(fill && { status: s.when_full, filled_at: new Date().toISOString() }),
    })
    .eq("id", id)
    .eq("owner_id", viewer.id);
  if (error) return failure(error, "Couldn't update the slots.");
  refresh(viewer, "services");
  return { ok: true };
}

/** Pause all closes every service and remembers each one's status; resume restores them exactly. */
export async function pauseAllServices(pause: boolean): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const supabase = await createSupabaseServer();
  const { data: rows, error } = await supabase.from("services").select("id, status, paused_status").eq("owner_id", viewer.id);
  if (error) return failure(error, "Couldn't reach your services.");

  const changes = (rows ?? []).flatMap((row) => {
    if (pause && row.paused_status === null) return [{ id: row.id, status: "closed", paused_status: row.status }];
    if (!pause && row.paused_status !== null) return [{ id: row.id, status: row.paused_status, paused_status: null }];
    return [];
  });
  for (const { id, ...change } of changes) {
    const { error: updateError } = await supabase.from("services").update({ ...change, filled_at: null }).eq("id", id).eq("owner_id", viewer.id);
    if (updateError) return failure(updateError, "Couldn't update every service. Try again.");
  }
  refresh(viewer, "services");
  return { ok: true };
}

/** Moves a service one place up or down on the profile. */
export async function moveService(id: string, direction: -1 | 1): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  return swapPositions(viewer, "services", id, direction);
}

/* -------------------------------------------------------------- adoptables */

export async function saveAdoptable(input: AdoptableInput): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const parsed = adoptableInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const a = parsed.data;
  if (a.images.some((image) => !isOwnArtPath(image.path, viewer.id, "listings"))) {
    return { ok: false, error: "One of the pictures isn't yours. Upload it again." };
  }

  const row = {
    name: a.name,
    species: a.species,
    description: a.description,
    images: a.images.map(({ path, width, height, palette }) => ({ path, width, height, palette: palette ?? [] })),
    price_usd: a.priceUsd,
    includes: a.includes,
    status: a.status,
  };

  const supabase = await createSupabaseServer();
  if (!a.id) {
    const { data, error } = await supabase.from("adoptables").insert(row).select("id").single();
    if (error || !data) return failure(error, "Couldn't list that character. Try again in a moment.");
    refresh(viewer, "adoptables");
    return { ok: true, id: data.id };
  }

  const { data: before } = await supabase.from("adoptables").select("images").eq("id", a.id).eq("owner_id", viewer.id).maybeSingle();
  if (!before) return { ok: false, error: "That listing doesn't exist anymore." };
  const { error } = await supabase.from("adoptables").update(row).eq("id", a.id).eq("owner_id", viewer.id);
  if (error) return failure(error, "Couldn't save your changes. Try again in a moment.");

  const kept = new Set(row.images.map((image) => image.path));
  await dropFiles(((before.images ?? []) as { path: string }[]).map((image) => image.path).filter((path) => !kept.has(path)));
  refresh(viewer, "adoptables");
  return { ok: true, id: a.id };
}

export async function deleteAdoptable(id: string): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("adoptables")
    .delete()
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("images")
    .maybeSingle();
  if (error) return failure(error, "Couldn't delete that listing.");
  if (!data) return { ok: false, error: "That listing doesn't exist anymore." };
  await dropFiles(((data.images ?? []) as { path: string }[]).map((image) => image.path));
  refresh(viewer, "adoptables");
  return { ok: true };
}

/** One click: Available, On hold or Adopted. */
export async function setAdoptableStatus(id: string, status: AdoptStatus): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  if (!["available", "reserved", "sold"].includes(status)) return { ok: false, error: "Unknown status." };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("adoptables")
    .update({ status })
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .select("id")
    .maybeSingle();
  if (error) return failure(error, "Couldn't change the status.");
  if (!data) return { ok: false, error: "That listing doesn't exist anymore." };
  refresh(viewer, "adoptables");
  return { ok: true };
}

export async function moveAdoptable(id: string, direction: -1 | 1): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  return swapPositions(viewer, "adoptables", id, direction);
}

/* ------------------------------------------------------------------ shared */

async function swapPositions(viewer: Viewer, table: "services" | "adoptables", id: string, direction: -1 | 1): Promise<StudioResult> {
  const supabase = await createSupabaseServer();
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, position")
    .eq("owner_id", viewer.id)
    .order("position")
    .order("created_at");
  if (error || !rows) return failure(error, "Couldn't reorder.");
  const i = rows.findIndex((row) => row.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };

  // Rewrite positions as 0..n so ties from older rows can't stick.
  const order = rows.map((row) => row.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [position, rowId] of order.entries()) {
    if (rows.find((row) => row.id === rowId)?.position === position) continue;
    const { error: updateError } = await supabase.from(table).update({ position }).eq("id", rowId).eq("owner_id", viewer.id);
    if (updateError) return failure(updateError, "Couldn't reorder.");
  }
  refresh(viewer, table);
  return { ok: true };
}
