import "server-only";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { ACCOUNT_COLUMNS, toArtistProfile, type AccountRow } from "@/lib/profile/accounts";
import { db } from "@/lib/profile/mock-db";
import type { Viewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isCancelReason, type CancelReason } from "./cancel";
import type { Lane, OrderStatus, QueueOrder, Step } from "./queue";
import type { MyRequest, RequestStatus } from "./requests";

/*
 * Real commission orders (Supabase `commission_requests`, see the
 * *_commission_orders.sql migration), as the artist's tickets (/commissions)
 * and the buyer's postcards (/requests). The order runs
 * pending | waitlisted → quoted → paid → in_progress → delivered, or ends
 * declined / cancelled / expired. Paying is stubbed until checkout exists:
 * only the team marks an order paid (`npm run orders`). Requests to the demo
 * artists are stored too (`demo_artist`), so the buyer's side is all real;
 * nobody answers those.
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
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  quote_usd: number | string | null;
  quote_note: string | null;
  due_date: string | null;
  quoted_at: string | null;
  quote_expires_at: string | null;
  paid_at: string | null;
  started_at: string | null;
  step: Step | null;
  delivered_at: string | null;
  delivery: { images?: StoredImage[]; note?: string } | null;
  answer_note: string | null;
  paused: boolean;
  archived_by_artist: boolean;
  /** Only on the artist's own read. */
  artist_note?: string | null;
  /** A demo artist (mock-db) instead of an account, and their service's id. */
  demo_artist: string | null;
  demo_service_id: string | null;
  buyer: AccountRow;
  artist: AccountRow | null;
  service: { examples: StoredImage[] } | null;
};

const BASE = `id, service_title, package, addons, estimate_usd, description, reference_links, deadline, usage, status, created_at, updated_at,
  quote_usd, quote_note, due_date, quoted_at, quote_expires_at, paid_at, started_at, step, delivered_at, delivery, answer_note, paused, archived_by_artist,
  demo_artist, demo_service_id`;
const PEOPLE = `buyer:profiles!commission_requests_buyer_id_fkey(${ACCOUNT_COLUMNS}),
  artist:profiles!commission_requests_artist_id_fkey(${ACCOUNT_COLUMNS}),
  service:services(examples)`;

const NOT_MIGRATED = new Set(["42P01", "PGRST205", "42703"]);

type Client = ReturnType<typeof createSupabaseAdmin> | Awaited<ReturnType<typeof createSupabaseServer>>;
type Why = { reason: CancelReason; note?: string };

/**
 * Why the buyer cancelled, for the cancelled ones among `rows`. A separate
 * read, so a database without the *_commission_cancel_reasons.sql migration
 * still shows every order (just without reasons).
 */
async function cancelReasons(client: Client, rows: Pick<Row, "id" | "status">[]): Promise<Map<string, Why>> {
  const ids = rows.filter((row) => row.status === "cancelled").map((row) => row.id);
  const reasons = new Map<string, Why>();
  if (ids.length === 0) return reasons;
  const { data } = await client.from("commission_requests").select("id, cancel_reason, cancel_note").in("id", ids);
  for (const row of (data ?? []) as { id: string; cancel_reason: string | null; cancel_note: string | null }[]) {
    if (isCancelReason(row.cancel_reason)) reasons.set(row.id, { reason: row.cancel_reason, ...(row.cancel_note && { note: row.cancel_note }) });
  }
  return reasons;
}

/** Quotes past their expiry close (and give their slots back) before anyone reads them. */
async function expireQuotes() {
  await createSupabaseAdmin().rpc("expire_commission_quotes").then(
    () => undefined,
    () => undefined,
  );
}

/** A stable four-digit ticket number from the request's id. */
export const ticketOf = (id: string) => (parseInt(id.replace(/-/g, "").slice(0, 6), 16) % 9000) + 1000;

const serviceName = (row: Row) => (row.package ? `${row.service_title} · ${row.package.label}` : row.service_title);
const extrasOf = (row: Row) => (row.addons ?? []).map(({ label, priceUsd }) => ({ label, priceUsd: Number(priceUsd) }));
const priceOf = (row: Row) => Number(row.quote_usd ?? row.estimate_usd ?? 0);
const deliveryOf = (row: Row) =>
  row.delivery?.images?.length
    ? {
        images: row.delivery.images.map((image, i) => toImageAsset(image, `${row.service_title}, delivered (${i + 1})`)),
        ...(row.delivery.note && { note: row.delivery.note }),
      }
    : undefined;

const LANE: Record<OrderStatus, Lane> = {
  pending: "request",
  waitlisted: "request",
  quoted: "proposal",
  paid: "queued",
  in_progress: "wip",
  delivered: "delivered",
  declined: "request",
  cancelled: "request",
  expired: "proposal",
};

const CLOSED: OrderStatus[] = ["declined", "cancelled", "expired"];

/** Requests to the signed-in artist, as tickets in their queue (newest first). */
export async function fetchIncomingRequests(viewer: Viewer): Promise<QueueOrder[]> {
  await expireQuotes();
  // The artist's own private note comes along, so this read uses the secret key, scoped to the viewer.
  const { data, error } = await createSupabaseAdmin()
    .from("commission_requests")
    .select(`${BASE}, artist_note, ${PEOPLE}`)
    .eq("artist_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<Row[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load your commissions: ${error.message}`);
  const reasons = await cancelReasons(createSupabaseAdmin(), data);

  return data.map((row) => {
    const why = reasons.get(row.id);
    const client = toArtistProfile(row.buyer);
    const closed = CLOSED.includes(row.status);
    const delivery = deliveryOf(row);
    const due = row.due_date ?? row.deadline;
    return {
      id: row.id,
      number: ticketOf(row.id),
      client: { handle: client.handle, name: client.displayName, avatar: { ...client.avatar, alt: "" } },
      service: serviceName(row),
      priceUsd: priceOf(row),
      // The quote is one price; before it, the estimate is the service plus what was ticked.
      ...(row.quote_usd === null && { extras: extrasOf(row) }),
      lane: LANE[row.status],
      ...(row.status === "in_progress" && { step: row.step ?? "sketch" }),
      ...(row.status === "delivered" && { step: "render" as const }),
      payment: row.status === "quoted" ? "invoiced" : ["paid", "in_progress", "delivered"].includes(row.status) ? "paid" : "unpaid",
      usage: row.usage,
      ...(row.status === "waitlisted" && { waitlist: true }),
      ...(row.paused && { paused: true }),
      ...((closed || row.archived_by_artist) && { archived: true }),
      ...(row.status === "declined" && { declined: true }),
      ...(why && { cancelReason: why.reason, ...(why.note && { cancelNote: why.note }) }),
      brief: row.description,
      references: [],
      ...(row.reference_links && { referenceLinks: row.reference_links }),
      requestedAt: row.created_at,
      ...(row.quote_expires_at && { proposalExpiresAt: row.quote_expires_at }),
      ...(row.paid_at && { paidAt: row.paid_at }),
      ...(due && { dueAt: `${due}T23:59:00Z` }),
      ...(row.delivered_at && { deliveredAt: row.delivered_at }),
      ...(row.artist_note && { note: row.artist_note }),
      ...(row.quote_note && { quoteNote: row.quote_note }),
      ...(delivery && { delivery }),
      real: true,
      orderStatus: row.status,
    } satisfies QueueOrder;
  });
}

/** Changes whenever any of the artist's orders does, so the queue takes the server's copy. */
export const queueVersion = (orders: QueueOrder[]) =>
  orders.map((o) => `${o.id.slice(0, 8)}.${o.orderStatus}.${o.step ?? ""}.${o.paused ? 1 : 0}${o.archived ? 1 : 0}`).join("|");

const STATUS: Record<OrderStatus, RequestStatus> = {
  pending: "sent",
  waitlisted: "waitlisted",
  quoted: "quoted",
  paid: "paid",
  in_progress: "paid",
  delivered: "delivered",
  declined: "declined",
  cancelled: "cancelled",
  expired: "expired",
};

/** Requests the signed-in buyer sent to real artists, as postcards. */
export async function fetchSentRequests(viewer: Viewer): Promise<MyRequest[]> {
  await expireQuotes();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("commission_requests")
    .select(`${BASE}, ${PEOPLE}`)
    .eq("buyer_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load your requests: ${error.message}`);
  const reasons = await cancelReasons(supabase, data);

  return data.flatMap((row) => {
    const why = reasons.get(row.id);
    const demo = row.demo_artist ? db.profiles.find((p) => p.handle === row.demo_artist) : undefined;
    const artist = demo ?? (row.artist && toArtistProfile(row.artist));
    if (!artist) return [];
    const demoCover = demo && db.services.find((s) => s.id === row.demo_service_id)?.examples[0];
    const cover = demoCover ? undefined : row.service?.examples?.[0];
    const closed = CLOSED.includes(row.status);
    const delivery = deliveryOf(row);
    const note = row.answer_note ?? (row.status === "quoted" || row.status === "delivered" ? (row.quote_note && row.status === "quoted" ? row.quote_note : row.delivery?.note) : null);
    return {
      id: row.id,
      artist: { handle: artist.handle, name: artist.displayName, avatar: { ...artist.avatar, alt: "" } },
      service: serviceName(row),
      ...(cover && { cover: toImageAsset(cover, row.service_title) }),
      ...(demoCover && { cover: demoCover }),
      brief: row.description,
      status: STATUS[row.status],
      ...(row.status === "in_progress" && { step: row.step ?? "sketch" }),
      priceUsd: priceOf(row),
      ...(row.quote_usd === null && { extras: extrasOf(row) }),
      sentAt: row.created_at,
      ...(row.quoted_at && { quotedAt: row.quoted_at }),
      ...(row.quote_expires_at && { quoteExpiresAt: row.quote_expires_at }),
      ...(row.paid_at && { paidAt: row.paid_at }),
      ...(row.due_date && { dueAt: `${row.due_date}T23:59:00Z` }),
      ...(row.delivered_at && { deliveredAt: row.delivered_at }),
      ...(closed && { closedAt: row.updated_at }),
      ...(note && { artistNote: note }),
      ...(why && { cancelReason: why.reason, ...(why.note && { cancelNote: why.note }) }),
      ...(delivery && { delivery: delivery.images[0] }),
      real: true,
      ...(demo && { demo: true }),
      cancellable: row.status === "pending" || row.status === "waitlisted" || row.status === "quoted",
    } satisfies MyRequest;
  });
}
