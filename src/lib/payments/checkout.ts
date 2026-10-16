import "server-only";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { platformFeePercent } from "@/lib/plans";
import { adoptablesTag, LISTINGS_TAG, profileTag } from "@/lib/profile/queries";
import type { Viewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { usdToBrl } from "./fx";
import { getPayoutAccount, refreshPayoutAccount, type PayoutAccount } from "./payouts";
import {
  adoptableOpen,
  amountIn,
  checkoutExpiry,
  currenciesFor,
  formatMoney,
  refundState,
  settleAdoption,
  settleCommission,
  type OrderState,
  type PayCurrency,
} from "./rules";
import { onAccount, stripe, stripeConfigured, stripeTestMode } from "./stripe";

/*
 * Paying for things: a commission's quote, or an adoptable. The buyer goes to
 * a Stripe Checkout page made on the artist's own Stripe account (a direct
 * charge: the money lands with the artist, Stripe takes its processing fee
 * there). While they're on it, the quote or the adoptable is held for them
 * (`checkout_until`). The payment is settled from two sides, whichever comes
 * first, and settling twice changes nothing: the buyer's return to
 * /checkout/return and Stripe's webhook (/api/stripe/webhook). A payment for
 * something that moved on meanwhile (a cancelled order, an adoptable someone
 * else got first) goes straight back to the buyer.
 */

export type StartResult = { ok: true; url: string } | { ok: false; error: string; signIn?: true };

type PaymentRow = {
  id: string;
  kind: "commission" | "adoption";
  request_id: string | null;
  adoptable_id: string | null;
  buyer_id: string | null;
  artist_id: string | null;
  account_id: string;
  checkout_id: string | null;
  checkout_url: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  amount_cents: number;
  currency: string;
  status: "open" | "paid" | "failed" | "expired" | "refund_pending" | "refunded" | "disputed";
  refund_source: "artist" | "team" | "dashboard" | "auto" | null;
  expires_at: string | null;
};

const db = () => createSupabaseAdmin();
const MINUTE = 60_000;
const UNAVAILABLE = "Payments aren't switched on here yet.";

const expire = (tag: string) => revalidateTag(tag, { expire: 0 });

/** An adoptable changed hands (or came back): its shelf, profile and discovery follow. */
async function refreshAdoptables(artistId: string | null) {
  if (!artistId) return;
  const { data } = await db().from("profiles").select("handle").eq("id", artistId).maybeSingle();
  if (!data) return;
  for (const tag of [adoptablesTag(data.handle), profileTag(data.handle), LISTINGS_TAG, "explore", "search-index", "explore-wall"]) expire(tag);
}

/** The artist's payouts, checked with Stripe when they weren't ready last time (or a while ago). */
async function readyPayouts(artistId: string): Promise<PayoutAccount | null> {
  const account = await getPayoutAccount(artistId);
  if (!account) return null;
  if (account.status === "active" && Date.now() - new Date(account.checkedAt).getTime() < 6 * 60 * MINUTE) return account;
  try {
    const fresh = await refreshPayoutAccount(account);
    return fresh.status === "active" ? fresh : null;
  } catch {
    return account.status === "active" ? account : null;
  }
}

/** The price in the currency the buyer picked, and the rate it took. */
async function priced(priceUsd: number, currency: PayCurrency) {
  if (currency === "usd") return { amount: amountIn(priceUsd, "usd"), rate: 1, source: null };
  const fx = await usdToBrl();
  if (!fx) return null;
  return { amount: amountIn(priceUsd, "brl", fx.rate), rate: fx.rate, source: `PTAX ${fx.day}` };
}

async function buyerEmail(userId: string) {
  const { data } = await db().auth.admin.getUserById(userId);
  return data.user?.email ?? undefined;
}

/** An unexpired checkout this buyer already opened for the same thing and currency: send them back to it. */
async function openCheckout(column: "request_id" | "adoptable_id", id: string, buyerId: string, currency: string) {
  const { data } = await db()
    .from("payments")
    .select("checkout_url, expires_at")
    .eq(column, id)
    .eq("buyer_id", buyerId)
    .eq("currency", currency)
    .eq("status", "open")
    .gt("expires_at", new Date(Date.now() + 5 * MINUTE).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.checkout_url ?? null;
}

/** Closes the buyer's other open checkouts for the same thing (another currency), so they can't pay twice. */
async function closeOtherCheckouts(column: "request_id" | "adoptable_id", id: string) {
  const { data } = await db().from("payments").select("id, account_id, checkout_id").eq(column, id).eq("status", "open");
  for (const row of data ?? []) {
    if (row.checkout_id) await stripe().checkout.sessions.expire(row.checkout_id, {}, onAccount(row.account_id)).catch(() => undefined);
    await db().from("payments").update({ status: "expired" }).eq("id", row.id).eq("status", "open");
  }
}

type CheckoutInput = {
  kind: "commission" | "adoption";
  subjectId: string;
  buyer: Viewer;
  artistId: string;
  account: PayoutAccount;
  priceUsd: number;
  currency: PayCurrency;
  name: string;
  description: string;
  origin: string;
  expiresAt: number;
};

/** Records the payment, then opens a Stripe Checkout page for it on the artist's account. */
async function createCheckout(input: CheckoutInput): Promise<StartResult> {
  const price = await priced(input.priceUsd, input.currency);
  if (!price) return { ok: false, error: "Couldn't get today's dollar rate for reais. Pay in US dollars, or try again in a moment." };
  const feeCents = Math.round((price.amount * platformFeePercent(new Date())) / 100);
  const column = input.kind === "commission" ? "request_id" : "adoptable_id";

  const { data: payment, error } = await db()
    .from("payments")
    .insert({
      kind: input.kind,
      [column]: input.subjectId,
      buyer_id: input.buyer.id,
      artist_id: input.artistId,
      account_id: input.account.accountId,
      amount_cents: price.amount,
      currency: input.currency,
      price_usd: input.priceUsd,
      fx_rate: price.rate,
      fx_source: price.source,
      platform_fee_cents: feeCents,
      expires_at: new Date(input.expiresAt).toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Couldn't start the payment. Try again in a moment." };

  const back = `${input.origin}/checkout/return?payment=${payment.id}`;
  const metadata = { artiflow_payment: payment.id, kind: input.kind, [column]: input.subjectId, buyer: input.buyer.handle };
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency,
              unit_amount: price.amount,
              product_data: { name: input.name.slice(0, 250), description: input.description.slice(0, 500) },
            },
          },
        ],
        customer_email: await buyerEmail(input.buyer.id),
        client_reference_id: payment.id,
        metadata,
        payment_intent_data: {
          description: `${input.name} · Artiflow`,
          metadata,
          // Artiflow's fee: 0% during the founding artists' offer (src/lib/plans.ts).
          ...(feeCents > 0 && { application_fee_amount: feeCents }),
        },
        expires_at: Math.floor(input.expiresAt / 1000),
        success_url: back,
        cancel_url: `${back}&cancelled=1`,
        locale: "auto",
      },
      onAccount(input.account.accountId),
    );
    await db().from("payments").update({ checkout_id: session.id, checkout_url: session.url }).eq("id", payment.id);
    return { ok: true, url: session.url! };
  } catch (cause) {
    await db().from("payments").update({ status: "failed" }).eq("id", payment.id);
    const message = cause instanceof Error ? cause.message : "";
    console.error("Stripe checkout failed", message);
    return { ok: false, error: "Stripe couldn't open the payment page. Try again in a moment." };
  }
}

/* --------------------------------------------------------------- commissions */

/** The buyer pays a quote. The quote is held while they're on Stripe's page. */
export async function startCommissionCheckout(buyer: Viewer, orderId: string, currency: PayCurrency, origin: string): Promise<StartResult> {
  if (!stripeConfigured()) return { ok: false, error: UNAVAILABLE };
  const { data: order } = await db()
    .from("commission_requests")
    .select("id, buyer_id, artist_id, status, quote_usd, quote_expires_at, service_title, package, demo_artist, checkout_until")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.buyer_id !== buyer.id) return { ok: false, error: "That order isn't yours." };
  if (order.status !== "quoted" || !order.quote_usd) return { ok: false, error: "This order already moved on. Refresh to see where it stands." };
  const held = order.checkout_until && new Date(order.checkout_until).getTime() > Date.now();
  if (new Date(order.quote_expires_at).getTime() < Date.now() && !held) return { ok: false, error: "The quote ran out. Ask the artist for a new one." };
  if (!order.artist_id) return { ok: false, error: "Demo artists can't be paid: they're examples." };

  const account = await readyPayouts(order.artist_id);
  if (!account) return { ok: false, error: "The artist hasn't finished setting up payouts, so this can't be paid yet." };
  if (!currenciesFor(account.country).includes(currency)) return { ok: false, error: "This artist takes payments in US dollars." };

  const reuse = await openCheckout("request_id", order.id, buyer.id, currency);
  if (reuse) return { ok: true, url: reuse };
  await closeOtherCheckouts("request_id", order.id);

  const expiresAt = checkoutExpiry(Date.now());
  // Hold the quote: it can't expire (or be paid twice) while the buyer is on Stripe's page.
  const { data: holding } = await db()
    .from("commission_requests")
    .update({ checkout_until: new Date(expiresAt).toISOString() })
    .eq("id", order.id)
    .eq("status", "quoted")
    .select("id")
    .maybeSingle();
  if (!holding) return { ok: false, error: "This order already moved on. Refresh to see where it stands." };

  const pkg = (order.package as { label?: string } | null)?.label;
  const { data: artist } = await db().from("profiles").select("display_name, handle").eq("id", order.artist_id).maybeSingle();
  const started = await createCheckout({
    kind: "commission",
    subjectId: order.id,
    buyer,
    artistId: order.artist_id,
    account,
    priceUsd: Number(order.quote_usd),
    currency,
    name: pkg ? `${order.service_title} · ${pkg}` : order.service_title,
    description: `A commission by ${artist?.display_name ?? "the artist"} (@${artist?.handle ?? ""}), on Artiflow.`,
    origin,
    expiresAt,
  });
  if (!started.ok) await db().from("commission_requests").update({ checkout_until: null }).eq("id", order.id).eq("status", "quoted");
  return started;
}

/* ---------------------------------------------------------------- adoptables */

export type AdoptionOptions =
  | { state: "open"; options: { currency: PayCurrency; amount: string }[]; test?: boolean }
  | { state: "sold" | "mine" | "held" | "in_checkout" | "no_payouts" | "gone" | "yours" };

/**
 * How someone can adopt this character right now, asked when its sheet
 * opens (fresh: the artist's payouts, someone else's checkout, today's rate
 * for reais). `inBrazil` puts reais first.
 */
export async function adoptionOptions(adoptableId: string, viewerId: string | null, inBrazil: boolean): Promise<AdoptionOptions> {
  const { data: adoptable } = await db().from("adoptables").select("id, owner_id, price_usd, status, checkout_until").eq("id", adoptableId).maybeSingle();
  if (!adoptable) return { state: "gone" };
  if (viewerId && adoptable.owner_id === viewerId) return { state: "yours" };
  const state = adoptableOpen({ status: adoptable.status, checkoutUntil: adoptable.checkout_until }, Date.now());
  if (state === "sold") {
    if (!viewerId) return { state: "sold" };
    const { data: mine } = await db().from("payments").select("id").eq("adoptable_id", adoptable.id).eq("buyer_id", viewerId).eq("status", "paid").limit(1).maybeSingle();
    return { state: mine ? "mine" : "sold" };
  }
  if (state === "held") return { state: "held" };
  if (state === "in_checkout") {
    // Their own checkout: they can go back to it.
    const resumable =
      viewerId &&
      (await db().from("payments").select("id").eq("adoptable_id", adoptable.id).eq("buyer_id", viewerId).eq("status", "open").limit(1).maybeSingle()).data;
    if (!resumable) return { state: "in_checkout" };
  }
  const account = await readyPayouts(adoptable.owner_id);
  if (!account) return { state: "no_payouts" };
  const priceUsd = Number(adoptable.price_usd);
  const fx = account.country === "BR" ? await usdToBrl() : null;
  const options = currenciesFor(account.country)
    .filter((currency) => currency === "usd" || fx)
    .map((currency) => ({ currency, amount: formatMoney(amountIn(priceUsd, currency, fx?.rate), currency) }));
  options.sort((a, b) => (a.currency === b.currency ? 0 : (a.currency === "brl") === inBrazil ? -1 : 1));
  return { state: "open", options, ...(stripeTestMode() && { test: true }) };
}

/** The buyer adopts a ready-made character. It's held for them while they pay; the first payment to land gets it. */
export async function startAdoptionCheckout(buyer: Viewer, adoptableId: string, currency: PayCurrency, origin: string): Promise<StartResult> {
  if (!stripeConfigured()) return { ok: false, error: UNAVAILABLE };
  const { data: adoptable } = await db()
    .from("adoptables")
    .select("id, owner_id, name, species, price_usd, status, checkout_until")
    .eq("id", adoptableId)
    .maybeSingle();
  if (!adoptable) return { ok: false, error: "That adoptable isn't listed anymore." };
  if (adoptable.owner_id === buyer.id) return { ok: false, error: "That's your own character." };

  const state = adoptableOpen({ status: adoptable.status, checkoutUntil: adoptable.checkout_until }, Date.now());
  if (state === "in_checkout") {
    const reuse = await openCheckout("adoptable_id", adoptable.id, buyer.id, currency);
    if (reuse) return { ok: true, url: reuse };
    return { ok: false, error: "Someone is paying for this one right now. If they don't finish, it's back in half an hour." };
  }
  if (state === "sold") return { ok: false, error: `${adoptable.name} already has a new home.` };
  if (state === "held") return { ok: false, error: `${adoptable.name} is on hold for someone.` };

  const account = await readyPayouts(adoptable.owner_id);
  if (!account) return { ok: false, error: "The artist hasn't finished setting up payouts, so this can't be paid yet." };
  if (!currenciesFor(account.country).includes(currency)) return { ok: false, error: "This artist takes payments in US dollars." };

  const expiresAt = checkoutExpiry(Date.now());
  const now = new Date().toISOString();
  // Hold it for this buyer, unless someone else got there first.
  const { data: holding } = await db()
    .from("adoptables")
    .update({ checkout_until: new Date(expiresAt).toISOString() })
    .eq("id", adoptable.id)
    .eq("status", "available")
    .or(`checkout_until.is.null,checkout_until.lt."${now}"`)
    .select("id")
    .maybeSingle();
  if (!holding) return { ok: false, error: "Someone is paying for this one right now. If they don't finish, it's back in half an hour." };
  await refreshAdoptables(adoptable.owner_id);

  const { data: artist } = await db().from("profiles").select("display_name, handle").eq("id", adoptable.owner_id).maybeSingle();
  const started = await createCheckout({
    kind: "adoption",
    subjectId: adoptable.id,
    buyer,
    artistId: adoptable.owner_id,
    account,
    priceUsd: Number(adoptable.price_usd),
    currency,
    name: `${adoptable.name}${adoptable.species ? `, ${adoptable.species}` : ""} (adoptable)`,
    description: `A ready-made character designed by ${artist?.display_name ?? "the artist"} (@${artist?.handle ?? ""}), on Artiflow.`,
    origin,
    expiresAt,
  });
  if (!started.ok) {
    await db().from("adoptables").update({ checkout_until: null }).eq("id", adoptable.id).neq("status", "sold");
    await refreshAdoptables(adoptable.owner_id);
  }
  return started;
}

/* ------------------------------------------------------------------ settling */

async function paymentById(id: string) {
  const { data } = await db().from("payments").select("*").eq("id", id).maybeSingle<PaymentRow>();
  return data;
}

async function paymentWhere(column: "checkout_id" | "charge_id" | "payment_intent_id", value: string) {
  const { data } = await db().from("payments").select("*").eq(column, value).maybeSingle<PaymentRow>();
  return data;
}

/** Lets go of the hold a checkout had on its quote or adoptable. */
async function releaseHold(payment: PaymentRow) {
  if (payment.request_id) await db().from("commission_requests").update({ checkout_until: null }).eq("id", payment.request_id).eq("status", "quoted");
  if (payment.adoptable_id) {
    await db().from("adoptables").update({ checkout_until: null }).eq("id", payment.adoptable_id).neq("status", "sold");
    await refreshAdoptables(payment.artist_id);
  }
}

/**
 * Where a payment's refunds stand at Stripe, kept on the payment: refunded,
 * or `refund_pending` while the artist's balance can't cover it (Stripe sends
 * it on its own once it can), or paid again if a refund failed.
 */
async function syncRefund(payment: PaymentRow): Promise<PaymentRow["status"]> {
  if (!payment.payment_intent_id) return payment.status;
  const refunds = await stripe().refunds.list({ payment_intent: payment.payment_intent_id, limit: 20 }, onAccount(payment.account_id));
  const state = refundState(
    refunds.data.map((refund) => ({ status: refund.status ?? "pending", amount: refund.amount })),
    payment.amount_cents,
  );
  // A dispute stands until Stripe closes it (settleDispute).
  if (payment.status === "disputed" && state.status === "paid") return payment.status;
  await db()
    .from("payments")
    .update({
      status: state.status,
      refunded_cents: state.refundedCents,
      ...(state.status === "refunded" && { refunded_at: new Date().toISOString() }),
    })
    .eq("id", payment.id);
  return state.status;
}

type RefundAsk = { source: NonNullable<PaymentRow["refund_source"]>; by?: string | null; reason?: string | null };

/** Asks Stripe to give a payment back (from the artist's balance), and records who asked and why. */
async function requestRefund(payment: PaymentRow, ask: RefundAsk): Promise<{ ok: true; status: PaymentRow["status"] } | { ok: false; error: string }> {
  if (!payment.payment_intent_id) return { ok: false, error: "That payment isn't complete yet." };
  try {
    await stripe().refunds.create(
      {
        payment_intent: payment.payment_intent_id,
        reason: ask.source === "auto" ? "duplicate" : "requested_by_customer",
        metadata: { artiflow_payment: payment.id, artiflow_refund: ask.source },
      },
      onAccount(payment.account_id),
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    // Stripe's own words help here (for example, a charge already refunded).
    return { ok: false, error: message ? `Stripe couldn't refund it: ${message}` : "Stripe couldn't refund it. Try again in a moment." };
  }
  await db()
    .from("payments")
    .update({
      refund_source: ask.source,
      refund_reason: ask.reason?.trim().slice(0, 500) || null,
      refund_requested_by: ask.by ?? null,
      refund_requested_at: new Date().toISOString(),
    })
    .eq("id", payment.id);
  return { ok: true, status: await syncRefund(payment) };
}

/** Gives a payment back to the buyer (the thing it paid for moved on). */
async function refundPayment(payment: PaymentRow, paymentIntent: string, why: string) {
  await db().from("payments").update({ payment_intent_id: paymentIntent }).eq("id", payment.id);
  const result = await requestRefund({ ...payment, payment_intent_id: paymentIntent }, { source: "auto", reason: why });
  if (!result.ok) console.error("Automatic refund failed", payment.id, result.error);
}

/** Stripe's fee and what reached the artist, from the charge's balance transaction (in the artist's settlement currency). */
function feesOf(intent: Stripe.PaymentIntent) {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const tx = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  return {
    charge_id: charge?.id ?? null,
    ...(tx && { processor_fee_cents: tx.fee, net_cents: tx.net, settlement_currency: tx.currency }),
  };
}

/**
 * Stripe's fee and what reached the artist, once the charge's balance
 * transaction exists (it can trail the payment by a few seconds).
 */
async function recordFees(payment: Pick<PaymentRow, "id" | "account_id" | "charge_id" | "payment_intent_id">) {
  let chargeId = payment.charge_id;
  if (!chargeId && payment.payment_intent_id) {
    const intent = await stripe().paymentIntents.retrieve(payment.payment_intent_id, {}, onAccount(payment.account_id));
    chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : (intent.latest_charge?.id ?? null);
  }
  if (!chargeId) return;
  const charge = await stripe().charges.retrieve(chargeId, { expand: ["balance_transaction"] }, onAccount(payment.account_id));
  const tx = typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  await db()
    .from("payments")
    .update({ charge_id: chargeId, ...(tx && { processor_fee_cents: tx.fee, net_cents: tx.net, settlement_currency: tx.currency }) })
    .eq("id", payment.id);
}

/** Fills in Stripe's fee for paid orders that don't have it yet (a few at a time; the artist's queue asks). */
export async function recordMissingFees(requestIds: string[]) {
  if (requestIds.length === 0 || !stripeConfigured()) return;
  const { data } = await db()
    .from("payments")
    .select("id, account_id, charge_id, payment_intent_id")
    .in("request_id", requestIds)
    .in("status", ["paid", "disputed", "refund_pending", "refunded"])
    .is("processor_fee_cents", null)
    .not("payment_intent_id", "is", null)
    .limit(5);
  await Promise.all((data ?? []).map((payment) => recordFees(payment).catch(() => undefined)));
}

/** Stripe finished a charge (its fee is known now): keep the fee. */
export async function settleChargeUpdate(charge: Stripe.Charge) {
  const payment = (await paymentWhere("charge_id", charge.id)) ?? (typeof charge.payment_intent === "string" ? await paymentWhere("payment_intent_id", charge.payment_intent) : null);
  if (payment && payment.status !== "open") await recordFees({ ...payment, charge_id: charge.id });
}

export type Settled = { status: PaymentRow["status"] | "pending"; kind?: PaymentRow["kind"]; subjectId?: string | null; artistId?: string | null };

/**
 * Settles a Checkout page: paid → the order is paid (or the adoptable sold),
 * expired → the hold is released. Safe to run any number of times.
 */
export async function settleCheckout(paymentId: string): Promise<Settled> {
  const payment = await paymentById(paymentId);
  if (!payment?.checkout_id) return { status: "pending" };
  const subject = { kind: payment.kind, subjectId: payment.request_id ?? payment.adoptable_id, artistId: payment.artist_id };
  if (payment.status !== "open" && payment.status !== "expired") return { ...subject, status: payment.status };

  const session = await stripe().checkout.sessions.retrieve(
    payment.checkout_id,
    { expand: ["payment_intent.latest_charge.balance_transaction"] },
    onAccount(payment.account_id),
  );
  if (session.payment_status !== "paid") {
    if (session.status === "expired") {
      await db().from("payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "open");
      await releaseHold(payment);
      return { ...subject, status: "expired" };
    }
    return { ...subject, status: "pending" };
  }

  const intent = session.payment_intent as Stripe.PaymentIntent;
  const paid = { status: "paid", paid_at: new Date().toISOString(), payment_intent_id: intent.id, ...feesOf(intent) };

  if (payment.kind === "commission" && payment.request_id) {
    const { data: order } = await db().from("commission_requests").select("status").eq("id", payment.request_id).maybeSingle();
    const { data: other } = await db()
      .from("payments")
      .select("id")
      .eq("request_id", payment.request_id)
      .in("status", ["paid", "disputed"])
      .neq("id", payment.id)
      .limit(1)
      .maybeSingle();
    const decision = order ? settleCommission({ status: order.status as OrderState, paidBy: other?.id ?? null }, payment.id) : "refund";
    if (decision === "pay") {
      const { data: moved } = await db()
        .from("commission_requests")
        .update({ status: "paid", paid_at: paid.paid_at, checkout_until: null })
        .eq("id", payment.request_id)
        .eq("status", "quoted")
        .select("id")
        .maybeSingle();
      if (moved) {
        await db().from("payments").update(paid).eq("id", payment.id).in("status", ["open", "expired"]);
        return { ...subject, status: "paid" };
      }
    }
    await refundPayment(payment, intent.id, "The order had moved on (cancelled, expired or already paid).");
    return { ...subject, status: "refunded" };
  }

  if (payment.kind === "adoption" && payment.adoptable_id) {
    const { data: adoptable } = await db().from("adoptables").select("status").eq("id", payment.adoptable_id).maybeSingle();
    const decision = adoptable ? settleAdoption({ status: adoptable.status }, payment.id) : "refund";
    if (decision === "sell") {
      const { data: sold } = await db()
        .from("adoptables")
        .update({ status: "sold", checkout_until: null })
        .eq("id", payment.adoptable_id)
        .neq("status", "sold")
        .select("id")
        .maybeSingle();
      if (sold) {
        // Paid: the trigger tells the artist (a notice on their order clipboard).
        await db().from("payments").update(paid).eq("id", payment.id).in("status", ["open", "expired"]);
        await refreshAdoptables(payment.artist_id);
        return { ...subject, status: "paid" };
      }
    }
    await refundPayment(payment, intent.id, "Someone else adopted it first.");
    return { ...subject, status: "refunded" };
  }

  return { ...subject, status: "pending" };
}

/** The buyer left Stripe's page without paying: close it and let the quote or adoptable go. */
export async function abandonCheckout(paymentId: string, buyerId: string): Promise<Settled> {
  const payment = await paymentById(paymentId);
  if (!payment || payment.buyer_id !== buyerId) return { status: "pending" };
  const settled = await settleCheckout(paymentId);
  if (settled.status !== "pending") return settled;
  if (payment.checkout_id) await stripe().checkout.sessions.expire(payment.checkout_id, {}, onAccount(payment.account_id)).catch(() => undefined);
  await db().from("payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "open");
  await releaseHold(payment);
  return { kind: payment.kind, subjectId: payment.request_id ?? payment.adoptable_id, artistId: payment.artist_id, status: "expired" };
}

/** A Checkout event from Stripe's webhook: find our payment and settle it. */
export async function settleSessionEvent(session: Stripe.Checkout.Session, failed = false) {
  const payment = (session.client_reference_id && (await paymentById(session.client_reference_id))) || (await paymentWhere("checkout_id", session.id));
  if (!payment) return;
  if (failed) {
    await db().from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "open");
    await releaseHold(payment);
    return;
  }
  await settleCheckout(payment.id);
}

/* ---------------------------------------------------------- refunds, disputes */

export type RefundResult = { ok: true; pending: boolean } | { ok: false; error: string };

/**
 * The artist gives a paid commission's money back (before delivering it): the
 * order closes as refunded, the slot comes back, the buyer is told. The money
 * comes out of the artist's Stripe balance (Stripe keeps its processing fee);
 * when the balance can't cover it, the refund waits there and goes through on
 * its own (`pending`). Orders the team marked paid (`npm run orders`) have no
 * payment: they just close.
 */
export async function refundCommission(artist: Viewer, orderId: string, note: string): Promise<RefundResult> {
  const { data: order } = await db().from("commission_requests").select("id, artist_id, status").eq("id", orderId).maybeSingle();
  if (!order || order.artist_id !== artist.id) return { ok: false, error: "That order isn't yours." };
  if (order.status !== "paid" && order.status !== "in_progress") return { ok: false, error: "Only paid orders that aren't delivered yet can be refunded." };

  let pending = false;
  const { data: payment } = await db().from("payments").select("*").eq("request_id", order.id).eq("status", "paid").maybeSingle<PaymentRow>();
  if (payment) {
    const asked = await requestRefund(payment, { source: "artist", by: artist.id, reason: note });
    if (!asked.ok) return asked;
    pending = asked.status === "refund_pending";
  }

  const { data: moved } = await db()
    .from("commission_requests")
    .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_note: note.trim().slice(0, 500) || null, refunded_by: "artist" })
    .eq("id", order.id)
    .in("status", ["paid", "in_progress"])
    .select("id")
    .maybeSingle();
  if (!moved) return { ok: false, error: "This order already moved on. Refresh to see where it stands." };
  return { ok: true, pending };
}

/**
 * The team gives a buyer their money back (an artist who vanished, a
 * delivery that wasn't what was paid for). Needs `money.refund`, checked by
 * the caller. The money still comes out of the artist's Stripe balance: when
 * it's empty, the refund waits (`pending`), and the buyer's bank is the way
 * left (a chargeback; Stripe covers what it can't recover from the artist).
 */
export async function teamRefund(member: Viewer, paymentId: string, reason: string): Promise<RefundResult> {
  const why = reason.trim();
  if (why.length < 5) return { ok: false, error: "Say why (the buyer reads it)." };
  const payment = await paymentById(paymentId);
  if (!payment) return { ok: false, error: "No payment with that id." };
  if (payment.status !== "paid") return { ok: false, error: "Only paid payments can be refunded (this one is " + payment.status.replace("_", " ") + ")." };
  const asked = await requestRefund(payment, { source: "team", by: member.id, reason: why });
  if (!asked.ok) return asked;
  if (payment.request_id) {
    await db()
      .from("commission_requests")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_note: why.slice(0, 500), refunded_by: "team" })
      .eq("id", payment.request_id)
      .in("status", ["paid", "in_progress", "delivered"]);
  }
  return { ok: true, pending: asked.status === "refund_pending" };
}

/** The team checks a waiting refund with Stripe again. */
export async function recheckRefund(paymentId: string): Promise<PaymentRow["status"] | null> {
  const payment = await paymentById(paymentId);
  return payment ? syncRefund(payment) : null;
}

/** A refund changed at Stripe (it went through, or failed): the payment follows. */
export async function settleRefundEvent(refund: Stripe.Refund) {
  const intent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  const payment = intent ? await paymentWhere("payment_intent_id", intent) : null;
  if (payment) await syncRefund(payment);
}

/**
 * A refund Stripe tells us about (made from the artist's own Stripe Dashboard,
 * or one of ours): the payment follows, and an order still paid closes as
 * refunded; an adoptable refunded from the Dashboard goes back on the shelf.
 */
export async function settleRefundedCharge(charge: Stripe.Charge) {
  const payment = (await paymentWhere("charge_id", charge.id)) ?? (typeof charge.payment_intent === "string" ? await paymentWhere("payment_intent_id", charge.payment_intent) : null);
  if (!payment) return;
  const fromDashboard = !payment.refund_source;
  if (fromDashboard) await db().from("payments").update({ refund_source: "dashboard", refund_requested_at: new Date().toISOString() }).eq("id", payment.id);
  const status = await syncRefund({ ...payment, payment_intent_id: payment.payment_intent_id ?? (typeof charge.payment_intent === "string" ? charge.payment_intent : null) });
  if (status !== "refunded" && status !== "refund_pending") return;
  if (payment.request_id && fromDashboard) {
    await db()
      .from("commission_requests")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_by: "dashboard" })
      .eq("id", payment.request_id)
      .in("status", ["paid", "in_progress"]);
  }
  if (payment.adoptable_id && fromDashboard && status === "refunded") {
    // The artist undid the sale: the character is back on the shelf.
    await db().from("adoptables").update({ status: "available" }).eq("id", payment.adoptable_id).eq("status", "sold");
    await refreshAdoptables(payment.artist_id);
  }
}

/** A buyer disputed a charge with their bank (Stripe tells the artist and handles the evidence with them). */
export async function settleDispute(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
  const payment = await paymentWhere("charge_id", chargeId);
  if (!payment) return;
  if (dispute.status === "won" || dispute.status === "warning_closed") {
    await db().from("payments").update({ status: "paid" }).eq("id", payment.id).eq("status", "disputed");
  } else if (dispute.status === "lost") {
    await db()
      .from("payments")
      .update({ status: "refunded", refunded_cents: dispute.amount, refunded_at: new Date().toISOString() })
      .eq("id", payment.id);
  } else {
    await db().from("payments").update({ status: "disputed" }).eq("id", payment.id).eq("status", "paid");
  }
}
