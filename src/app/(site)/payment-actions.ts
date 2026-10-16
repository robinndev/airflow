"use server";

import { headers } from "next/headers";
import { siteOrigin } from "@/lib/auth/redirects";
import { getViewerAccess } from "@/lib/artists/server";
import {
  adoptionOptions,
  refundCommission,
  startAdoptionCheckout,
  type RefundResult,
  startCommissionCheckout,
  type AdoptionOptions,
  type StartResult,
} from "@/lib/payments/checkout";
import { createPayoutAccount, getPayoutAccount, onboardingLink } from "@/lib/payments/payouts";
import { countryName, isPayoutCountry, type PayCurrency } from "@/lib/payments/rules";
import { stripeConfigured } from "@/lib/payments/stripe";
import { getViewer } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Payments, from the browser: artists set up where they get paid (their own
 * Stripe account), buyers pay a quote or adopt, artists refund. Each returns
 * a Stripe page to send the browser to, or a reason it can't. The work is in
 * src/lib/payments/.
 */

const SIGN_IN = { ok: false, error: "Sign in first.", signIn: true } as const;
const OFF = { ok: false, error: "Payments aren't switched on here yet." } as const;

const isCurrency = (value: unknown): value is PayCurrency => value === "usd" || value === "brl";

function stripeError(cause: unknown, fallback: string): StartResult {
  console.error(fallback, cause instanceof Error ? cause.message : cause);
  return { ok: false, error: fallback };
}

/**
 * An artist's first "Set up payouts": makes their Stripe account in the
 * country they live in (Stripe can't change it later) and sends them to
 * Stripe's form. Next time, it picks up where they left off.
 */
export async function startPayouts(country: string): Promise<StartResult> {
  if (!stripeConfigured()) return OFF;
  const access = await getViewerAccess();
  if (!access) return SIGN_IN;
  if (!access.artist) return { ok: false, error: "Getting paid comes with artist access. Add your artist code first." };
  const origin = await siteOrigin();
  try {
    const existing = await getPayoutAccount(access.id);
    if (existing) {
      if (existing.country !== country) {
        return { ok: false, error: `Your payouts are set up in ${countryName(existing.country)}, and Stripe can't change that.` };
      }
      return { ok: true, url: await onboardingLink(existing.accountId, origin) };
    }
    if (!isPayoutCountry(country)) return { ok: false, error: "Pick the country you live in." };
    const admin = createSupabaseAdmin();
    const [{ data: user }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(access.id),
      admin.from("profiles").select("display_name").eq("id", access.id).maybeSingle(),
    ]);
    const account = await createPayoutAccount({
      userId: access.id,
      handle: access.handle,
      name: profile?.display_name ?? access.handle,
      email: user.user?.email,
      country,
      origin,
    });
    return { ok: true, url: await onboardingLink(account.accountId, origin) };
  } catch (cause) {
    return stripeError(cause, "Stripe couldn't open payouts for that country. Try again, or tell us at the help desk.");
  }
}

/** Back to Stripe's form, to finish (or update) what Stripe asked for. */
export async function continuePayouts(): Promise<StartResult> {
  if (!stripeConfigured()) return OFF;
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const account = await getPayoutAccount(viewer.id);
  if (!account) return { ok: false, error: "Set up payouts first." };
  try {
    return { ok: true, url: await onboardingLink(account.accountId, await siteOrigin()) };
  } catch (cause) {
    return stripeError(cause, "Stripe didn't answer. Try again in a moment.");
  }
}

/** The buyer pays a quote: Stripe's payment page, on the artist's account. */
export async function payForOrder(orderId: string, currency: string): Promise<StartResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  if (!isCurrency(currency)) return { ok: false, error: "Pick how you'll pay." };
  try {
    return await startCommissionCheckout(viewer, orderId, currency, await siteOrigin());
  } catch (cause) {
    return stripeError(cause, "Stripe didn't answer. Try again in a moment.");
  }
}

/** How the viewer can adopt this character right now (its sheet asks when it opens). Visitors too. */
export async function getAdoptionOptions(adoptableId: string): Promise<AdoptionOptions> {
  if (!stripeConfigured()) return { state: "no_payouts" };
  const [viewer, h] = await Promise.all([getViewer(), headers()]);
  try {
    return await adoptionOptions(adoptableId, viewer?.id ?? null, h.get("x-vercel-ip-country")?.toUpperCase() === "BR");
  } catch (cause) {
    console.error("Adoption options failed", cause instanceof Error ? cause.message : cause);
    return { state: "no_payouts" };
  }
}

/** The buyer adopts a ready-made character. */
export async function adoptCharacter(adoptableId: string, currency: string): Promise<StartResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  if (!isCurrency(currency)) return { ok: false, error: "Pick how you'll pay." };
  try {
    return await startAdoptionCheckout(viewer, adoptableId, currency, await siteOrigin());
  } catch (cause) {
    return stripeError(cause, "Stripe didn't answer. Try again in a moment.");
  }
}

/** The artist gives a paid commission's money back, before delivering it. */
export async function refundOrder(orderId: string, note = ""): Promise<RefundResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  try {
    return await refundCommission(viewer, orderId, note);
  } catch (cause) {
    console.error("Refund failed", cause instanceof Error ? cause.message : cause);
    return { ok: false, error: "Couldn't refund it. Try again in a moment." };
  }
}
