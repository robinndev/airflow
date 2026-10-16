import { NextResponse, type NextRequest } from "next/server";
import { abandonCheckout, settleCheckout, type Settled } from "@/lib/payments/checkout";
import { getViewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Back from Stripe's payment page (paid, or "← back"). Settles the payment
 * right away (the webhook may not have arrived yet; settling twice is safe),
 * then shows the buyer where things stand: their postcard on /requests, or
 * the adoptable on the artist's shelf.
 */

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("payment") ?? "";
  const cancelled = url.searchParams.has("cancelled");
  if (!UUID.test(id)) return NextResponse.redirect(new URL("/requests", request.url));

  const viewer = await getViewer();
  let settled: Settled = { status: "pending" };
  try {
    settled = cancelled && viewer ? await abandonCheckout(id, viewer.id) : await settleCheckout(id);
  } catch (cause) {
    console.error("Settling a checkout failed", cause instanceof Error ? cause.message : cause);
  }
  const outcome = settled.status === "paid" ? "paid" : settled.status === "refunded" ? "refunded" : cancelled ? "cancelled" : "pending";

  if (settled.kind === "adoption" && settled.artistId && settled.subjectId) {
    const { data } = await createSupabaseAdmin().from("profiles").select("handle").eq("id", settled.artistId).maybeSingle();
    if (data) {
      const to = new URL(`/${data.handle}/adoptables`, request.url);
      to.searchParams.set("adoption", outcome);
      to.hash = settled.subjectId;
      return NextResponse.redirect(to);
    }
  }
  const to = new URL("/requests", request.url);
  to.searchParams.set("payment", outcome);
  return NextResponse.redirect(to);
}
