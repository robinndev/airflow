import type Stripe from "stripe";
import { settleChargeUpdate, settleDispute, settleRefundedCharge, settleRefundEvent, settleSessionEvent } from "@/lib/payments/checkout";
import { refreshPayoutAccountById } from "@/lib/payments/payouts";
import { stripe, stripeConfigured } from "@/lib/payments/stripe";

/*
 * Stripe tells us what happened on the artists' accounts: payments that went
 * through (or gave up), refunds made from their Stripe Dashboard, disputes,
 * account changes. Point a Connect webhook ("events on connected accounts")
 * here; STRIPE_WEBHOOK_SECRET takes its signing secret (several, comma
 * separated, when more than one endpoint sends here). Every handler is safe
 * to run twice: Stripe retries until it gets a 2xx.
 */

const secrets = () =>
  (process.env.STRIPE_WEBHOOK_SECRET ?? "")
    .split(",")
    .map((secret) => secret.trim())
    .filter(Boolean);

function verify(body: string, signature: string): { snapshot: Stripe.Event } | { thin: { type: string; accountId?: string } } | null {
  for (const secret of secrets()) {
    try {
      return { snapshot: stripe().webhooks.constructEvent(body, signature, secret) };
    } catch {
      // Not this endpoint's secret, or a thin (v2) event: try the next way.
    }
    try {
      const note = stripe().parseEventNotification(body, signature, secret) as unknown as { type: string; related_object?: { id?: string } };
      return { thin: { type: note.type, accountId: note.related_object?.id } };
    } catch {
      // Not this secret either.
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!stripeConfigured() || secrets().length === 0) return new Response("Payments aren't configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await request.text();
  const event = verify(body, signature);
  if (!event) return new Response("Bad signature", { status: 400 });

  try {
    if ("thin" in event) {
      // Accounts v2 send their changes as thin events (event destinations).
      if (event.thin.type.startsWith("v2.core.account") && event.thin.accountId) await refreshPayoutAccountById(event.thin.accountId);
      return Response.json({ received: true });
    }

    const { snapshot } = event;
    switch (snapshot.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired":
        await settleSessionEvent(snapshot.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await settleSessionEvent(snapshot.data.object, true);
        break;
      case "charge.refunded":
        await settleRefundedCharge(snapshot.data.object);
        break;
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
      case "charge.refund.updated":
        await settleRefundEvent(snapshot.data.object);
        break;
      case "charge.succeeded":
      case "charge.updated":
        await settleChargeUpdate(snapshot.data.object);
        break;
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
        await settleDispute(snapshot.data.object);
        break;
      case "account.updated":
        await refreshPayoutAccountById(snapshot.account ?? snapshot.data.object.id);
        break;
    }
  } catch (cause) {
    console.error("Stripe webhook failed", cause instanceof Error ? cause.message : cause);
    // Stripe retries later.
    return new Response("Couldn't handle it yet", { status: 500 });
  }
  return Response.json({ received: true });
}
