import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { payoutStatusOf, type PayoutCountry, type PayoutStatus } from "./rules";
import { stripe } from "./stripe";

/*
 * Where artists get paid: their own Stripe account, connected to Artiflow's
 * platform (`payout_accounts`, *_payments.sql). The account is the artist's
 * (full Stripe Dashboard: they log in at stripe.com to see payments and get
 * paid); Stripe collects what it needs to know about them on its own pages
 * and covers what can't be recovered from them (Managed Risk). Read and
 * written with the secret key, after the caller checked the session.
 */

export type PayoutAccount = { userId: string; accountId: string; country: string; status: PayoutStatus; checkedAt: string };

type Row = { user_id: string; account_id: string; country: string; status: PayoutStatus; checked_at: string };

const toAccount = (row: Row): PayoutAccount => ({
  userId: row.user_id,
  accountId: row.account_id,
  country: row.country,
  status: row.status,
  checkedAt: row.checked_at,
});

const NOT_MIGRATED = new Set(["42P01", "PGRST205"]);

export async function getPayoutAccount(userId: string): Promise<PayoutAccount | null> {
  const { data, error } = await createSupabaseAdmin().from("payout_accounts").select("*").eq("user_id", userId).maybeSingle<Row>();
  if (error && !NOT_MIGRATED.has(error.code)) throw new Error(`Couldn't read payouts: ${error.message}`);
  return data ? toAccount(data) : null;
}

/** Artists (by account id) whose buyers can pay them right now. */
export async function payableArtists(userIds: string[]): Promise<Map<string, PayoutAccount>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const ready = new Map<string, PayoutAccount>();
  if (unique.length === 0) return ready;
  const { data, error } = await createSupabaseAdmin().from("payout_accounts").select("*").in("user_id", unique).returns<Row[]>();
  if (error) return ready;
  for (const row of data) if (row.status === "active") ready.set(row.user_id, toAccount(row));
  return ready;
}

/** Asks Stripe where the account stands and keeps the answer. */
export async function refreshPayoutAccount(account: PayoutAccount): Promise<PayoutAccount> {
  const remote = await stripe().v2.core.accounts.retrieve(account.accountId, { include: ["configuration.merchant", "requirements"] });
  const capability = remote.configuration?.merchant?.capabilities?.card_payments?.status;
  const awaiting = (remote.requirements?.entries ?? []).some((entry) => entry.awaiting_action_from === "user");
  const status = remote.closed ? "unsupported" : payoutStatusOf(capability, awaiting);
  const checkedAt = new Date().toISOString();
  await createSupabaseAdmin().from("payout_accounts").update({ status, checked_at: checkedAt }).eq("user_id", account.userId);
  return { ...account, status, checkedAt };
}

/** Stripe said an account changed (its webhook): check it again. */
export async function refreshPayoutAccountById(accountId: string): Promise<void> {
  const { data } = await createSupabaseAdmin().from("payout_accounts").select("*").eq("account_id", accountId).maybeSingle<Row>();
  if (data) await refreshPayoutAccount(toAccount(data));
}

const isPublic = (origin: string) => origin.startsWith("https://") && !/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin);

/**
 * The artist's Stripe account, made on their first "Set up payouts". What we
 * already know is filled in, so Stripe's form asks less: their email, name,
 * profile link, and what they sell.
 */
export async function createPayoutAccount(input: {
  userId: string;
  handle: string;
  name: string;
  email?: string;
  country: PayoutCountry;
  origin: string;
}): Promise<PayoutAccount> {
  const account = await stripe().v2.core.accounts.create({
    ...(input.email && { contact_email: input.email }),
    display_name: input.name.slice(0, 100),
    dashboard: "full",
    identity: { country: input.country.toLowerCase(), entity_type: "individual" },
    configuration: { merchant: { mcc: "7333", capabilities: { card_payments: { requested: true } } } },
    defaults: {
      // Stripe bills its processing fee to the artist's account and covers losses it can't recover (Managed Risk).
      responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
      locales: [input.country === "BR" ? "pt-BR" : "en-US"],
      profile: {
        // Their profile as the business's site (Stripe refuses local addresses: then it just asks).
        ...(isPublic(input.origin) && { business_url: `${input.origin}/${input.handle}` }),
        product_description: "Digital art commissions and ready-made character designs (adoptables), sold on Artiflow.",
      },
    },
    metadata: { artiflow_user: input.userId, artiflow_handle: input.handle },
  } as Parameters<ReturnType<typeof stripe>["v2"]["core"]["accounts"]["create"]>[0]);

  const row = { user_id: input.userId, account_id: account.id, country: input.country, status: "incomplete" as const };
  const { error } = await createSupabaseAdmin().from("payout_accounts").insert(row);
  if (error) throw new Error(`Couldn't save payouts: ${error.message}`);
  return { userId: input.userId, accountId: account.id, country: input.country, status: "incomplete", checkedAt: new Date().toISOString() };
}

/** A one-time link to Stripe's own pages, where the artist fills in (or finishes) their details. */
export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        return_url: `${origin}/studio/payouts/return`,
        refresh_url: `${origin}/studio/payouts/refresh`,
      },
    },
  } as Parameters<ReturnType<typeof stripe>["v2"]["core"]["accountLinks"]["create"]>[0]);
  return link.url;
}
