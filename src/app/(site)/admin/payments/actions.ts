"use server";

import { recheckRefund, teamRefund, type RefundResult } from "@/lib/payments/checkout";
import { stripeConfigured } from "@/lib/payments/stripe";
import { getTeamRole, teamPermissions } from "@/lib/admin/team";
import { getViewer } from "@/lib/session";

/*
 * The team's money actions (/admin/payments). Admins see payments; giving a
 * buyer's money back takes the `money.refund` permission, given by name
 * (`npm run team -- grant @handle money.refund`). Both checked fresh here.
 */

async function refunder() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const permissions = await teamPermissions(viewer.id);
  return permissions.includes("money.refund") ? viewer : null;
}

/** Gives the buyer their money back, from the artist's Stripe balance (it waits there if the balance is short). */
export async function refundBuyer(paymentId: string, reason: string): Promise<RefundResult> {
  if (!stripeConfigured()) return { ok: false, error: "Payments aren't switched on here." };
  const member = await refunder();
  if (!member) return { ok: false, error: "Refunds take the money.refund permission." };
  try {
    return await teamRefund(member, paymentId, reason);
  } catch (cause) {
    console.error("Team refund failed", cause instanceof Error ? cause.message : cause);
    return { ok: false, error: "Couldn't refund it. Try again in a moment." };
  }
}

/** Asks Stripe again where a waiting refund stands. */
export async function checkRefund(paymentId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const viewer = await getViewer();
  if (!viewer || (await getTeamRole(viewer.id)) !== "admin") return { ok: false, error: "Team only." };
  try {
    const status = await recheckRefund(paymentId);
    return status ? { ok: true, status } : { ok: false, error: "No payment with that id." };
  } catch (cause) {
    console.error("Refund check failed", cause instanceof Error ? cause.message : cause);
    return { ok: false, error: "Stripe didn't answer. Try again in a moment." };
  }
}
