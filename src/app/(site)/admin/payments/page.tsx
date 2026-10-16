import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { CheckRefund, RefundBuyer } from "@/components/admin/refund-buyer";
import { Stamp } from "@/components/explore/stamp";
import { SiteHeader } from "@/components/site/site-header";
import { requireAdmin, teamPermissions } from "@/lib/admin/team";
import { formatLongDate } from "@/lib/format";
import { fetchTeamPayments, isTeamShow, type TeamPayment, type TeamShow } from "@/lib/payments/team";
import { stripeConfigured, stripeTestMode } from "@/lib/payments/stripe";

export const metadata: Metadata = {
  title: "Payments · Back office",
  robots: { index: false, follow: false },
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

const SHOW_LABEL: Record<TeamShow, string> = {
  all: "All",
  paid: "Paid",
  refund_pending: "Refund waiting",
  refunded: "Refunded",
  disputed: "Disputed",
};

const STATUS: Record<TeamPayment["status"], { label: string; tone: "mint" | "lilac" | "like" | "muted" | "ocean" }> = {
  paid: { label: "Paid", tone: "mint" },
  refund_pending: { label: "Refund waiting", tone: "lilac" },
  refunded: { label: "Refunded", tone: "muted" },
  disputed: { label: "Disputed", tone: "like" },
};

const SOURCE: Record<NonNullable<TeamPayment["refund"]>["source"], string> = {
  artist: "the artist",
  team: "the team",
  dashboard: "the artist, from Stripe",
  auto: "Artiflow, automatically",
};

/*
 * The team's view of the money (admins): every payment that went through,
 * who paid whom for what, and refunds. "Refund buyer" (the `money.refund`
 * permission) gives a buyer their money back when an artist vanished; it
 * comes out of the artist's Stripe balance and waits there if it's short.
 */
export default function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip pb-28">
        <Suspense fallback={<div aria-hidden className={`${container} pt-12`}><div className="skeleton h-14 w-80 rounded-[12px]" /></div>}>
          <Payments searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Payments({ searchParams }: Pick<PageProps<"/admin/payments">, "searchParams">) {
  const viewer = await requireAdmin("/admin/payments");
  const params = await searchParams;
  const show = isTeamShow(params.show) ? params.show : "all";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [payments, permissions] = await Promise.all([fetchTeamPayments({ show, q }), teamPermissions(viewer.id)]);
  const canRefund = permissions.includes("money.refund");

  return (
    <div className={`${container} pt-10 sm:pt-14`}>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        Back office
      </Link>
      <p className="mt-6 flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
        <ShieldCheck aria-hidden className="size-3.5 text-ocean" />
        Payments · team only
      </p>
      <h1 className="mt-3 font-display text-[2.25rem] leading-none font-extrabold tracking-tight text-ink sm:text-[2.75rem]">Payments and refunds</h1>
      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Every sale is paid into the artist&apos;s own Stripe account, so a refund comes out of their balance, never ours. When it&apos;s short,
        Stripe keeps the refund waiting and sends it as soon as it can.{" "}
        {canRefund ? "You can refund buyers (money.refund)." : "Refunding buyers takes the money.refund permission."}
      </p>
      {stripeConfigured() && stripeTestMode() && (
        <p className="mt-4 inline-flex rounded-full bg-star/30 px-3 py-1 text-xs font-semibold text-ink">Stripe test mode: no real money moves.</p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <nav aria-label="Show">
          <ul className="flex flex-wrap gap-1 rounded-full bg-ice p-1">
            {(Object.keys(SHOW_LABEL) as TeamShow[]).map((id) => (
              <li key={id}>
                <Link
                  href={`/admin/payments?${new URLSearchParams({ ...(id !== "all" && { show: id }), ...(q && { q }) })}`}
                  aria-current={id === show ? "page" : undefined}
                  className={`flex h-8 items-center rounded-full px-3 text-sm font-semibold ${id === show ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"}`}
                >
                  {SHOW_LABEL[id]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/admin/payments" className="flex items-center gap-2">
          {show !== "all" && <input type="hidden" name="show" value={show} />}
          <label className="relative">
            <span className="sr-only">Find a payment</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="@handle, order or payment id"
              className="h-10 w-72 max-w-full rounded-input border border-border bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-muted"
            />
          </label>
        </form>
      </div>

      {payments.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          {q ? "No payments match that." : "No payments here yet."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {payments.map((payment) => (
            <li key={payment.id} data-payment={payment.id} className="rounded-card border border-border bg-surface p-4 shadow-soft sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-bold tracking-[0.16em] text-muted uppercase">
                    {payment.kind === "commission" ? "Commission" : "Adoption"}
                    {payment.paidAt && <> · {formatLongDate(payment.paidAt)}</>}
                  </p>
                  <p className="mt-1 font-display text-lg font-extrabold text-ink">
                    {payment.href ? (
                      <Link href={payment.href} className="hover:underline">
                        {payment.what}
                      </Link>
                    ) : (
                      payment.what
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {payment.buyer ? <Link href={`/${payment.buyer}`} className="font-semibold text-ink hover:underline">@{payment.buyer}</Link> : "Someone"} paid{" "}
                    {payment.artist ? <Link href={`/${payment.artist}`} className="font-semibold text-ink hover:underline">@{payment.artist}</Link> : "an artist"}{" "}
                    <span className="font-display font-extrabold text-ink">{payment.amount}</span>
                    {payment.stripeFee && <> · Stripe took {payment.stripeFee}</>}
                    {payment.orderStatus && <> · order {payment.orderStatus.replace("_", " ")}</>}
                  </p>
                  {payment.refund && (
                    <p className="mt-2 text-sm text-ink/85">
                      Refund asked by {payment.refund.by ? `@${payment.refund.by} (${SOURCE[payment.refund.source]})` : SOURCE[payment.refund.source]}
                      {payment.refund.at && <>, {formatLongDate(payment.refund.at)}</>}
                      {payment.refund.refunded && <> · {payment.refund.refunded} back so far</>}
                      {payment.refund.reason && <span className="mt-1 block rounded-[10px] bg-ice px-3 py-2">&ldquo;{payment.refund.reason}&rdquo;</span>}
                    </p>
                  )}
                </div>
                <Stamp tone={STATUS[payment.status].tone} className="rotate-2">
                  {STATUS[payment.status].label}
                </Stamp>
              </div>
              {(payment.status === "paid" && canRefund) || payment.status === "refund_pending" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
                  {payment.status === "paid" && canRefund && (
                    <RefundBuyer id={payment.id} amount={payment.amount} buyer={payment.buyer} artist={payment.artist} />
                  )}
                  {payment.status === "refund_pending" && (
                    <>
                      <span className="text-sm text-muted">Waiting on the artist&apos;s Stripe balance. The buyer can also ask their bank (a chargeback).</span>
                      <CheckRefund id={payment.id} />
                    </>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
