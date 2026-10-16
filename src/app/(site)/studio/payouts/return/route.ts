import { NextResponse, type NextRequest } from "next/server";
import { getPayoutAccount, refreshPayoutAccount } from "@/lib/payments/payouts";
import { getViewer } from "@/lib/session";

/** Back from Stripe's form: ask Stripe where the account stands, then show it on the studio. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/sign-in?next=/studio", request.url));
  const to = new URL("/studio", request.url);
  const account = await getPayoutAccount(viewer.id);
  if (account) {
    try {
      const fresh = await refreshPayoutAccount(account);
      to.searchParams.set("payouts", fresh.status);
    } catch (cause) {
      console.error("Couldn't check payouts", cause instanceof Error ? cause.message : cause);
    }
  }
  to.hash = "payouts";
  return NextResponse.redirect(to);
}
