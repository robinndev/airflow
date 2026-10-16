import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { formatMoney } from "./rules";

/*
 * Payments as the team sees them (/admin/payments): every checkout that went
 * through (or is waiting on a refund), who paid whom for what, and where its
 * refund stands. Read with the secret key, after the page's admin check.
 */

export type TeamPaymentStatus = "paid" | "refund_pending" | "refunded" | "disputed";

export type TeamPayment = {
  id: string;
  kind: "commission" | "adoption";
  what: string;
  /** Where to look at it: the buyer's order or the adoptable on the artist's shelf. */
  href?: string;
  buyer?: string;
  artist?: string;
  amount: string;
  stripeFee?: string;
  status: TeamPaymentStatus;
  paidAt?: string;
  refund?: { source: "artist" | "team" | "dashboard" | "auto"; reason?: string; by?: string; at?: string; refunded?: string };
  accountId: string;
  orderStatus?: string;
};

export const TEAM_SHOWS = ["all", "paid", "refund_pending", "refunded", "disputed"] as const;
export type TeamShow = (typeof TEAM_SHOWS)[number];
export const isTeamShow = (value: unknown): value is TeamShow => TEAM_SHOWS.includes(value as TeamShow);

type Row = {
  id: string;
  kind: "commission" | "adoption";
  request_id: string | null;
  adoptable_id: string | null;
  account_id: string;
  amount_cents: number;
  currency: string;
  processor_fee_cents: number | null;
  settlement_currency: string | null;
  refunded_cents: number;
  status: TeamPaymentStatus;
  paid_at: string | null;
  refund_source: "artist" | "team" | "dashboard" | "auto" | null;
  refund_reason: string | null;
  refund_requested_at: string | null;
  buyer: { handle: string } | null;
  artist: { handle: string } | null;
  asker: { handle: string } | null;
  request: { service_title: string; status: string } | null;
  adoptable: { name: string } | null;
};

const SELECT = `id, kind, request_id, adoptable_id, account_id, amount_cents, currency, processor_fee_cents, settlement_currency,
  refunded_cents, status, paid_at, refund_source, refund_reason, refund_requested_at,
  buyer:profiles!payments_buyer_id_fkey(handle), artist:profiles!payments_artist_id_fkey(handle),
  asker:profiles!payments_refund_requested_by_fkey(handle),
  request:commission_requests(service_title, status), adoptable:adoptables(name)`;

/** The latest payments that went through, newest first; `q` finds a buyer or artist by handle, or a payment or order by id. */
export async function fetchTeamPayments({ show = "all", q = "" }: { show?: TeamShow; q?: string } = {}): Promise<TeamPayment[]> {
  const db = createSupabaseAdmin();
  let query = db
    .from("payments")
    .select(SELECT)
    .in("status", show === "all" ? ["paid", "refund_pending", "refunded", "disputed"] : [show])
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const term = q.trim().replace(/^@/, "").toLowerCase();
  if (term) {
    if (/^[0-9a-f-]{36}$/.test(term)) {
      query = query.or(`id.eq.${term},request_id.eq.${term},adoptable_id.eq.${term}`);
    } else {
      const { data: people } = await db.from("profiles").select("id").eq("handle", term);
      const id = people?.[0]?.id;
      if (!id) return [];
      query = query.or(`buyer_id.eq.${id},artist_id.eq.${id}`);
    }
  }

  const { data, error } = await query.returns<Row[]>();
  if (error) {
    // A database without the payments migration has no payments.
    if (["42P01", "PGRST205", "42703", "PGRST200"].includes(error.code)) return [];
    throw new Error(`Couldn't load payments: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    what: row.request?.service_title ?? row.adoptable?.name ?? (row.kind === "commission" ? "A commission" : "An adoptable"),
    ...(row.kind === "adoption" && row.artist && row.adoptable_id && { href: `/${row.artist.handle}/adoptables#${row.adoptable_id}` }),
    ...(row.buyer && { buyer: row.buyer.handle }),
    ...(row.artist && { artist: row.artist.handle }),
    amount: formatMoney(row.amount_cents, row.currency),
    ...(row.processor_fee_cents !== null && row.settlement_currency && { stripeFee: formatMoney(row.processor_fee_cents, row.settlement_currency) }),
    status: row.status,
    ...(row.paid_at && { paidAt: row.paid_at }),
    ...(row.refund_source && {
      refund: {
        source: row.refund_source,
        ...(row.refund_reason && { reason: row.refund_reason }),
        ...(row.asker && { by: row.asker.handle }),
        ...(row.refund_requested_at && { at: row.refund_requested_at }),
        ...(row.refunded_cents > 0 && { refunded: formatMoney(row.refunded_cents, row.currency) }),
      },
    }),
    accountId: row.account_id,
    ...(row.request && { orderStatus: row.request.status }),
  }));
}
