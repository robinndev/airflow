import { headers } from "next/headers";
import { ExternalLink } from "lucide-react";
import { Stamp } from "@/components/explore/stamp";
import { getPayoutAccount, refreshPayoutAccount, type PayoutAccount } from "@/lib/payments/payouts";
import { countryName, isPayoutCountry } from "@/lib/payments/rules";
import { stripeConfigured, stripeTestMode } from "@/lib/payments/stripe";
import { ContinuePayouts, SetUpPayouts } from "./payouts-buttons";

/*
 * "Getting paid" on /studio: where the artist's payouts stand, and the one
 * next step (set up, finish, wait, done). Payouts are the artist's own
 * Stripe account; Stripe asks what it needs on its own pages.
 */

const MINUTE = 60_000;

/** The artist's payout account, checked with Stripe again when it isn't active yet. */
async function currentAccount(userId: string): Promise<PayoutAccount | null> {
  const account = await getPayoutAccount(userId);
  if (!account || account.status === "active") return account;
  if (Date.now() - new Date(account.checkedAt).getTime() < MINUTE) return account;
  return refreshPayoutAccount(account).catch(() => account);
}

export async function PayoutsCard({ userId }: { userId: string }) {
  if (!stripeConfigured()) return null;
  const [account, h] = await Promise.all([currentAccount(userId), headers()]);
  const guess = h.get("x-vercel-ip-country")?.toUpperCase();

  return (
    <section
      id="payouts"
      aria-labelledby="payouts-heading"
      className="grain relative scroll-mt-24 rounded-panel border border-border bg-surface p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">Getting paid</p>
          <h2 id="payouts-heading" className="mt-1 font-display text-xl font-extrabold text-ink">
            {!account
              ? "Connect Stripe to get paid."
              : {
                  incomplete: "Finish setting up payouts.",
                  review: "Stripe is checking your details.",
                  active: "Payouts are on.",
                  unsupported: "Stripe can't take payments for you right now.",
                }[account.status]}
          </h2>
        </div>
        {account && <StatusStamp status={account.status} />}
      </div>

      {stripeTestMode() && (
        <p className="mt-3 max-w-2xl rounded-[12px] bg-star/25 px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Test mode:</span> nothing here is real yet. On Stripe&apos;s form, use its test data (the phone
          code is 000 000, and the form offers test values). When payments go live, you&apos;ll set up again with your real details.
        </p>
      )}

      {!account && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Buyers pay on Artiflow and the money goes straight to your own Stripe account; Stripe sends it on to your bank. Setting up
            takes 5 to 10 minutes on Stripe&apos;s pages: who you are and where to send the money (anyone taking card payments is asked
            this). Until then, buyers can request and save, but not pay you.
          </p>
          <SetUpPayouts defaultCountry={isPayoutCountry(guess) ? guess : undefined} />
        </>
      )}

      {account?.status === "incomplete" && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Stripe still needs a few details before buyers can pay you. It picks up where you left off.
          </p>
          <ContinuePayouts label="Continue on Stripe" />
        </>
      )}

      {account?.status === "review" && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Usually a few minutes, sometimes a day or two. Buyers can pay you as soon as Stripe is done; this card updates itself.
          </p>
          <ContinuePayouts label="Check what Stripe asked" variant="secondary" />
        </>
      )}

      {account?.status === "active" && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Buyers can pay your quotes and adopt your characters. Payments land in your Stripe account ({countryName(account.country)}),
          and Stripe sends them to your bank.{" "}
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-ink underline-offset-4 hover:underline"
          >
            Open your Stripe Dashboard
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </p>
      )}

      {account?.status === "unsupported" && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Stripe turned card payments off for this account. Look for an email from Stripe, or check what it asked.
          </p>
          <ContinuePayouts label="Check on Stripe" variant="secondary" />
        </>
      )}
    </section>
  );
}

function StatusStamp({ status }: { status: PayoutAccount["status"] }) {
  const { label, tone } = {
    incomplete: { label: "To finish", tone: "lilac" as const },
    review: { label: "In review", tone: "ocean" as const },
    active: { label: "Payouts on", tone: "mint" as const },
    unsupported: { label: "Paused", tone: "like" as const },
  }[status];
  return (
    <Stamp tone={tone} className="rotate-3">
      {label}
    </Stamp>
  );
}
