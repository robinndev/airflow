import "server-only";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { ACCOUNT_COLUMNS, toArtistProfile, type AccountRow } from "@/lib/profile/accounts";
import type { Viewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { QueueOrder } from "./queue";
import type { MyRequest, RequestStatus } from "./requests";

/*
 * Requests really sent to real artists (Supabase `commission_requests`), as
 * the queue's tickets (/commissions, the artist) and the buyer's postcards
 * (/requests). Read as the signed-in user: row level security shows each side
 * only its own. Proposals, payment and delivery come with the commission
 * flow; until then a request is new, waitlisted, accepted or closed.
 */

type Row = {
  id: string;
  service_title: string;
  package: { id: string; label: string; priceUsd: number } | null;
  addons: { id: string; label: string; priceUsd: number }[];
  estimate_usd: number | string | null;
  description: string;
  reference_links: string | null;
  deadline: string | null;
  usage: "personal" | "commercial";
  status: "pending" | "waitlisted" | "declined" | "cancelled" | "accepted";
  created_at: string;
  updated_at: string;
  buyer: AccountRow;
  artist: AccountRow;
  service: { examples: StoredImage[] } | null;
};

const COLUMNS = `id, service_title, package, addons, estimate_usd, description, reference_links, deadline, usage, status, created_at, updated_at,
  buyer:profiles!commission_requests_buyer_id_fkey(${ACCOUNT_COLUMNS}),
  artist:profiles!commission_requests_artist_id_fkey(${ACCOUNT_COLUMNS}),
  service:services(examples)`;

const NOT_MIGRATED = new Set(["42P01", "PGRST205"]);

async function select(column: "artist_id" | "buyer_id", viewer: Viewer): Promise<Row[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("commission_requests")
    .select(COLUMNS)
    .eq(column, viewer.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load your requests: ${error.message}`);
  return data;
}

const extrasOf = (row: Row) => (row.addons ?? []).map(({ label, priceUsd }) => ({ label, priceUsd: Number(priceUsd) }));

const serviceName = (row: Row) => (row.package ? `${row.service_title} · ${row.package.label}` : row.service_title);

/** A stable four-digit ticket number from the request's id. */
const numberOf = (id: string) => (parseInt(id.replace(/-/g, "").slice(0, 6), 16) % 9000) + 1000;

/** Requests to the signed-in artist, as tickets in their queue. */
export async function fetchIncomingRequests(viewer: Viewer): Promise<QueueOrder[]> {
  const rows = await select("artist_id", viewer);
  return rows.map((row) => {
    const client = toArtistProfile(row.buyer);
    const closed = row.status === "declined" || row.status === "cancelled";
    return {
      id: row.id,
      number: numberOf(row.id),
      client: { handle: client.handle, name: client.displayName, avatar: { ...client.avatar, alt: "" } },
      service: serviceName(row),
      priceUsd: Number(row.estimate_usd ?? 0),
      extras: extrasOf(row),
      lane: row.status === "accepted" ? "proposal" : "request",
      payment: row.status === "accepted" ? "invoiced" : "unpaid",
      usage: row.usage,
      ...(row.status === "waitlisted" && { waitlist: true }),
      ...(closed && { archived: true, declined: row.status === "declined" }),
      brief: row.description,
      references: [],
      ...(row.reference_links && { referenceLinks: row.reference_links }),
      requestedAt: row.created_at,
      ...(row.deadline && { dueAt: `${row.deadline}T23:59:00Z` }),
      real: true,
    } satisfies QueueOrder;
  });
}

const STATUS: Record<Row["status"], RequestStatus> = {
  pending: "sent",
  waitlisted: "waitlisted",
  accepted: "sent",
  declined: "declined",
  cancelled: "cancelled",
};

/** Requests the signed-in buyer sent to real artists, as postcards. */
export async function fetchSentRequests(viewer: Viewer): Promise<MyRequest[]> {
  const rows = await select("buyer_id", viewer);
  return rows.map((row) => {
    const artist = toArtistProfile(row.artist);
    const cover = row.service?.examples?.[0];
    const closed = row.status === "declined" || row.status === "cancelled";
    return {
      id: row.id,
      artist: { handle: artist.handle, name: artist.displayName, avatar: { ...artist.avatar, alt: "" } },
      service: serviceName(row),
      ...(cover && { cover: toImageAsset(cover, row.service_title) }),
      brief: row.description,
      status: STATUS[row.status],
      priceUsd: Number(row.estimate_usd ?? 0),
      extras: extrasOf(row),
      sentAt: row.created_at,
      ...(closed && { closedAt: row.updated_at }),
      ...(row.status === "accepted" && { artistNote: "Their quote arrives here once checkout opens." }),
      real: true,
      cancellable: row.status === "pending" || row.status === "waitlisted",
    };
  });
}
