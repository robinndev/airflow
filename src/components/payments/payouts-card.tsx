import { headers } from "next/headers";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Stamp } from "@/components/explore/stamp";
import { getPayoutAccount, refreshPayoutAccount, type PayoutAccount } from "@/lib/payments/payouts";
import { countryName, isPayoutCountry, needsRecheck } from "@/lib/payments/rules";
import { stripeConfigured, stripeTestMode } from "@/lib/payments/stripe";
import { ContinuePayouts, SetUpPayouts } from "./payouts-buttons";
import { PayoutsWatch } from "./payouts-watch";

/*
 * "Getting paid" on /studio: where the artist's payouts stand, and the one
 * next step (set up, finish, wait, done). Payouts are the artist's own
 * Stripe account; Stripe asks what it needs on its own pages.
 */

/** The artist's payout account, checked with Stripe again when it isn't active yet. */
async function currentAccount(userId: string): Promise<PayoutAccount | null> {
  const account = await getPayoutAccount(userId);
  if (!account || !needsRecheck(account)) return account;
  return refreshPayoutAccount(account).catch(() => account);
}

export async function PayoutsCard({ userId }: { userId: string }) {
  if (!stripeConfigured()) return null;
  const [account, h] = await Promise.all([currentAccount(userId), headers()]);
  const guess = h.get("x-vercel-ip-country")?.toUpperCase();
  const test = stripeTestMode();

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

      {test && account && account.status !== "incomplete" && (
        <p className="mt-3 max-w-2xl rounded-[12px] bg-star/25 px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Test mode:</span> nothing here is real yet. When payments go live, you&apos;ll set up again with your
          real details.
        </p>
      )}

      {!account && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Buyers pay on Artiflow and the money goes straight to your own Stripe account; Stripe sends it on to your bank. Setting up
            takes 5 to 10 minutes on Stripe&apos;s pages: who you are and where to send the money (anyone taking card payments is asked
            this). Stripe may ask for a photo of your ID and a selfie: that goes straight to Stripe, and Artiflow doesn&apos;t collect or store
            it. Until then, buyers can request and save, but not pay you.
          </p>
          {test && <TestFormValues />}
          <SetUpPayouts defaultCountry={isPayoutCountry(guess) ? guess : undefined} />
        </>
      )}

      {account?.status === "incomplete" && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Stripe still needs a few details before buyers can pay you. It picks up where you left off.
          </p>
          {test && <TestFormValues />}
          <ContinuePayouts label="Continue on Stripe" />
        </>
      )}

      {account?.status === "review" && (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Usually a minute or two, sometimes a day or two. Buyers can pay you as soon as Stripe is done, even with this page closed.
          </p>
          <PayoutsWatch />
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

const Value = ({ children }: { children: string }) => <code className="font-mono font-semibold select-all">{children}</code>;

/** Stripe's test mode only passes its own values: a made-up date or address fails its checks and leaves the form stuck. */
const TEST_FORM: [label: string, value: ReactNode][] = [
  ["Email taken?", "If Stripe says the email already has an account, choose another one: add +artist before the @."],
  ["Phone code", <Value key="code">000000</Value>],
  ["Name", "Anything."],
  ["Date of birth", <Value key="born">01/01/1901</Value>],
  ["Address, line 1", <Value key="address">address_full_match</Value>],
  [
    "ID number",
    <>
      Brazil, CPF <Value>000.000.000-00</Value>. US, SSN <Value>000-00-0000</Value>.
    </>,
  ],
  ["Document", "Pick any document type, start the verification, then choose Simulate. Upload nothing."],
  [
    "Bank",
    <>
      The &ldquo;test account&rdquo; button. Or Brazil, <Value>110-0000</Value> and <Value>0001234</Value>. US, <Value>110000000</Value> and{" "}
      <Value>000123456789</Value>.
    </>,
  ],
  ["Fraud protection", "The free one (Radar Lite)."],
];

function TestFormValues() {
  return (
    <div className="mt-3 max-w-2xl rounded-[12px] bg-star/25 px-3 py-2.5 text-sm text-ink">
      <p>
        <span className="font-semibold">Test mode:</span> nothing here is real yet, so Stripe&apos;s form only passes with these values. Never
        enter your real details or documents. When payments go live, you&apos;ll set up again for real.
      </p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        {TEST_FORM.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="mt-1 font-semibold sm:mt-0">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
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
