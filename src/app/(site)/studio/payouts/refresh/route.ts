import { NextResponse, type NextRequest } from "next/server";
import { getPayoutAccount, onboardingLink } from "@/lib/payments/payouts";
import { getViewer } from "@/lib/session";

/** Stripe's one-time form link ran out (or was reloaded): make a fresh one. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/sign-in?next=/studio", request.url));
  const account = await getPayoutAccount(viewer.id);
  if (!account) return NextResponse.redirect(new URL("/studio#payouts", request.url));
  try {
    return NextResponse.redirect(await onboardingLink(account.accountId, new URL(request.url).origin));
  } catch {
    return NextResponse.redirect(new URL("/studio?payouts=error#payouts", request.url));
  }
}
