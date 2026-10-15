import Link from "next/link";
import type { ReactNode } from "react";
import { formatDay, formatHours, formatPercent, formatSpan, formatValue } from "@/lib/admin/format";
import { changeOf, type Bucket, type Dashboard, type Metric } from "@/lib/admin/metrics";
import { RANGES, type AdminQuery } from "@/lib/admin/range";
import { PLANS } from "@/lib/plans";
import { AdminRail } from "./rail";
import { Receipt } from "./receipt";
import { BarList, Card, CardTitle, ChangeNote, Fact, Section, StatTile } from "./parts";
import { TimeChart, type ChartPoint } from "./time-chart";

/*
 * The back office, laid out: the controls, what we kept (the receipt) beside
 * the headline numbers, then people, money, commissions, the shop and
 * everyday activity, and how each number is counted. Server-rendered; only
 * the charts are client islands (hover and keys).
 */

const pointsOf = (buckets: Bucket[]): ChartPoint[] =>
  buckets.map((b) => ({ short: formatDay(b.start), long: formatSpan(b.start, b.end) }));
const valuesOf = (buckets: Bucket[], metric: Metric) => buckets.map((b) => b.values[metric]);

const S1 = "var(--series-1)";
const S2 = "var(--series-2)";
const S3 = "var(--series-3)";
const S4 = "var(--series-4)";

export function BackOffice({ dash, query }: { dash: Dashboard; query: AdminQuery }) {
  const { totals, previousTotals: before, window } = dash;
  const range = RANGES[query.range];
  const against = window.compare ? `vs the ${range.label} before` : "";
  const per = dash.bucketDays === 1 ? "day" : "week";
  const points = pointsOf(dash.current);
  const values = (metric: Metric) => valuesOf(dash.current, metric);
  const trend = (metric: Metric) => ({ previous: valuesOf(dash.previous, metric), current: values(metric) });
  const change = (metric: Metric) => changeOf(totals[metric], before ? before[metric] : null);
  const mrr = dash.accounts.subscribers * PLANS.flow_plus.priceUsd;
  const period = formatSpan(window.from, window.to);

  return (
    <>
      <AdminRail query={query} generatedAt={dash.generatedAt} />

      {/* What we kept, and the headline numbers. */}
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <Receipt
          lines={dash.receipt}
          totalUsd={totals.revenueUsd}
          change={change("revenueUsd")}
          against={against}
          period={period}
          feePercent={dash.feePercent}
          query={query}
        />

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <StatTile
            label="New accounts"
            value={formatValue(totals.signups)}
            change={change("signups")}
            against={against}
            detail={`${formatValue(dash.accounts.total)} accounts in all`}
            trend={trend("signups")}
          />
          <StatTile
            label="Active, on an average day"
            value={formatValue(totals.active, "average")}
            change={change("active")}
            against={against}
            detail={`${dash.active.today} today · ${dash.active.week} this week · ${dash.active.month} in 30 days`}
            trend={trend("active")}
          />
          <StatTile
            label="Paid through Artiflow"
            value={formatValue(totals.gmvUsd, "usd")}
            change={change("gmvUsd")}
            against={against}
            detail="Commissions, adoptables and the shop"
            trend={trend("gmvUsd")}
          />
          <StatTile
            label="Commissions paid"
            value={formatValue(totals.paidOrders)}
            change={change("paidOrders")}
            against={against}
            detail={dash.averageOrderUsd === null ? "No paid orders yet" : `${formatValue(dash.averageOrderUsd, "usd")} on average`}
            trend={trend("paidOrders")}
          />
          <StatTile
            label="Flow+ members"
            value={formatValue(dash.accounts.subscribers)}
            detail={`${formatValue(mrr, "usd")} a month · ${formatValue(totals.newMembers)} new in this period`}
            trend={trend("subscribers")}
          />
          <StatTile
            label="Commission requests"
            value={formatValue(totals.requests)}
            change={change("requests")}
            against={against}
            detail={dash.requests.sent ? `${formatPercent(dash.funnel[1].share)} got a quote` : "None in this period"}
            trend={trend("requests")}
          />
        </div>
      </div>

      {/* People ------------------------------------------------------------- */}
      <Section
        id="people"
        eyebrow="People"
        title="Who's joining, who's here"
        lede="An account counts as active on a day it opened Artiflow signed in. Before 15 October we only knew the days people did something (signed in, posted, liked, wrote…), so the early days read a little low."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle title="New accounts" hint={`Accounts made each ${per}.`} />
            <TimeChart label={`New accounts per ${per}`} points={points} series={[{ id: "signups", label: "New accounts", color: S1, values: values("signups") }]} />
          </Card>
          <Card>
            <CardTitle title="Active accounts" hint={dash.bucketDays === 1 ? "Accounts here each day." : "Accounts here on an average day of each week."} />
            <TimeChart
              label="Active accounts"
              kind="line"
              unit="average"
              points={points}
              series={[{ id: "active", label: "Active accounts", color: S1, values: values("active") }]}
              reference={{ value: totals.active, label: `avg ${formatValue(totals.active, "average")}` }}
            />
          </Card>
        </div>

        <Card className="mt-4">
          <CardTitle title="Who they are" hint="Everyone with an account today." />
          <Composition
            parts={[
              { id: "verified", label: "Verified artists", n: dash.accounts.verified, color: S1 },
              { id: "artists", label: "Artists", n: dash.accounts.artists - dash.accounts.verified, color: S2 },
              { id: "collectors", label: "Collectors", n: dash.accounts.collectors, color: S3 },
            ]}
          />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-5">
            <Fact label="New artists in this period" value={formatValue(dash.accounts.new_artists)} />
            <Fact label="Flow+ members" value={formatValue(dash.accounts.subscribers)} />
            <Fact
              label="Come back daily"
              hint="Average day ÷ active in 30 days"
              value={dash.active.stickiness === null ? "—" : formatPercent(dash.active.stickiness)}
            />
            <Fact label="Email not confirmed yet" value={formatValue(dash.accounts.unconfirmed)} />
            <Fact label="Signed in, no handle yet" value={formatValue(dash.accounts.noHandle)} />
          </dl>
        </Card>
      </Section>

      {/* Money -------------------------------------------------------------- */}
      <Section
        id="money"
        eyebrow="Money"
        title="What went through, what we kept"
        lede={`Buyers' money on the left, Artiflow's share on the right: ${dash.feePercent}% of every commission and adoptable, all of the shop, and Flow+ at ${formatValue(PLANS.flow_plus.priceUsd, "usd")} a month, spread over the days. Same color, same source, in both.`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle
              title="Paid through Artiflow"
              hint={`Per ${per}, by what was bought.`}
              aside={<Total value={totals.gmvUsd} change={change("gmvUsd")} against={against} />}
            />
            <TimeChart
              label={`Paid through Artiflow per ${per}`}
              unit="usd"
              points={points}
              series={[
                { id: "commissions", label: "Commissions", color: S1, values: values("commissionsUsd") },
                { id: "adoptables", label: "Adoptables", color: S2, values: values("adoptionsUsd") },
                { id: "shop", label: "Shop", color: S3, values: values("shopUsd") },
              ]}
            />
          </Card>
          <Card>
            <CardTitle
              title="What Artiflow keeps"
              hint={`Per ${per}, by where it comes from.`}
              aside={<Total value={totals.revenueUsd} change={change("revenueUsd")} against={against} />}
            />
            <TimeChart
              label={`Artiflow's revenue per ${per}`}
              unit="usd"
              points={points}
              series={[
                { id: "commissions", label: "Commission fees", color: S1, values: values("feeCommissionsUsd") },
                { id: "adoptables", label: "Adoptable fees", color: S2, values: values("feeAdoptionsUsd") },
                { id: "shop", label: "Shop", color: S3, values: values("shopUsd") },
                { id: "plans", label: "Flow+", color: S4, values: values("plansUsd") },
              ]}
            />
          </Card>
        </div>

        <Card className="mt-4">
          <CardTitle title="Orders right now" hint="Whatever the period: where every open order stands today." />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Fact
              label="Quoted, awaiting payment"
              hint={`${formatValue(dash.pipeline.awaiting_payment)} ${dash.pipeline.awaiting_payment === 1 ? "order" : "orders"}`}
              value={formatValue(dash.pipeline.awaiting_payment_usd, "usd")}
            />
            <Fact
              label="Paid, being drawn"
              hint={`${formatValue(dash.pipeline.in_the_works)} in the works`}
              value={formatValue(dash.pipeline.in_the_works_usd, "usd")}
            />
            <Fact label="Waiting on the artist" hint="New or waitlisted" value={formatValue(dash.pipeline.waiting_on_artist)} />
            <Fact label="Flow+ a month" hint={`${dash.accounts.subscribers} × ${formatValue(PLANS.flow_plus.priceUsd, "usd")}`} value={formatValue(mrr, "usd")} />
          </dl>
        </Card>
      </Section>

      {/* Commissions -------------------------------------------------------- */}
      <Section
        id="commissions"
        eyebrow="Commissions"
        title="From request to delivery"
        lede="Requests sent in this period, and how far each has got so far. Requests to the demo artists are left out (nobody answers those)."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card>
            <CardTitle title="How far requests get" hint={`${formatValue(dash.requests.sent)} sent to real artists`} />
            <BarList
              max={dash.requests.sent}
              empty="No requests in this period."
              rows={dash.funnel.map((step) => ({
                id: step.id,
                label: step.label,
                value: step.n,
                note: step.id === "sent" ? undefined : formatPercent(step.share),
              }))}
            />
            <ul className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
              <Chip label="Still waiting" n={dash.requests.waiting} />
              <Chip label="Declined" n={dash.requests.declined} />
              <Chip label="Taken back by the buyer" n={dash.requests.cancelled} />
              <Chip label="Quote expired" n={dash.requests.expired} />
              <Chip label="To demo artists" n={dash.requests.to_demo} />
            </ul>
          </Card>
          <Card>
            <CardTitle title="Top artists" hint="By commissions paid in this period." />
            <BarList
              unit="usd"
              empty="No paid commissions in this period."
              rows={dash.topArtists.map((artist) => ({
                id: artist.handle,
                label: (
                  <Link href={`/${artist.handle}`} className="font-medium hover:text-ocean hover:underline">
                    {artist.name} <span className="text-muted">@{artist.handle}</span>
                  </Link>
                ),
                value: artist.usd,
                note: `${artist.orders} ${artist.orders === 1 ? "order" : "orders"}`,
              }))}
            />
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card>
            <CardTitle title="Requests and payments" hint={`Requests sent and orders paid, per ${per}.`} />
            <TimeChart
              label={`Commission requests and paid orders per ${per}`}
              kind="line"
              points={points}
              series={[
                { id: "requests", label: "Requests sent", color: S1, values: values("requests") },
                { id: "paid", label: "Orders paid", color: S2, values: values("paidOrders") },
              ]}
            />
          </Card>
          <Card>
            <CardTitle title="Pace and shelves" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Fact
                label="Request to quote"
                hint="Median"
                value={dash.requests.hours_to_quote === null ? "—" : formatHours(dash.requests.hours_to_quote)}
              />
              <Fact
                label="Paid to delivered"
                hint="Median"
                value={dash.requests.days_to_deliver === null ? "—" : formatHours(dash.requests.days_to_deliver * 24)}
              />
              <Fact
                label="Studios open"
                hint={`${dash.listings.services_open} open · ${dash.listings.services_waitlist} waitlist · ${dash.listings.services_closed} closed`}
                value={formatValue(dash.listings.studios_open)}
              />
              <Fact
                label="Adoptables on offer"
                hint={`${dash.listings.adoptables_reserved} reserved · ${dash.listings.adoptables_listed} listed in this period`}
                value={formatValue(dash.listings.adoptables_available)}
              />
              <Fact label="Adopted in this period" value={formatValue(totals.adoptions)} hint={formatValue(totals.adoptionsUsd, "usd")} />
              <Fact label="Average commission" value={dash.averageOrderUsd === null ? "—" : formatValue(dash.averageOrderUsd, "usd")} />
            </dl>
          </Card>
        </div>
      </Section>

      {/* Shop --------------------------------------------------------------- */}
      <Section
        id="shop"
        eyebrow="Shop"
        title="Frames, effects and the rest"
        lede="What people took from /shop in this period: free items claimed, items bought, Flow+ members' monthly pick and gifts. Prices are the catalog's (placeholders until shop pricing is decided)."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card className="overflow-hidden !px-0 !pb-0">
            <div className="px-5 sm:px-6">
              <CardTitle title="By aisle" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-y border-border bg-ice/60 text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 pl-5 font-semibold sm:pl-6">
                      Aisle
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Claimed free
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Bought
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Flow+ picks
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Gifts
                    </th>
                    <th scope="col" className="py-2 pr-5 pl-3 text-right font-semibold sm:pr-6">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {dash.shop.map((row) => (
                    <tr key={row.kind} className="border-b border-border last:border-b-0">
                      <th scope="row" className="py-2.5 pr-3 pl-5 font-medium text-ink sm:pl-6">
                        {row.label}
                      </th>
                      <td className="px-3 py-2.5 text-right text-ink">{formatValue(row.claimed)}</td>
                      <td className="px-3 py-2.5 text-right text-ink">{formatValue(row.bought)}</td>
                      <td className="px-3 py-2.5 text-right text-ink">
                        {formatValue(row.picks)}
                        {row.picks > 0 && <span className="block text-[0.6875rem] text-muted">worth {formatValue(row.picksWorthUsd, "usd")}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink">{formatValue(row.gifts)}</td>
                      <td className="py-2.5 pr-5 pl-3 text-right font-semibold text-ink sm:pr-6">{formatValue(row.revenueUsd, "usd")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-ice/60 tabular-nums">
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 pl-5 font-semibold text-ink sm:pl-6">
                      All aisles
                    </th>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{formatValue(sumRows(dash, "claimed"))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{formatValue(sumRows(dash, "bought"))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{formatValue(sumRows(dash, "picks"))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{formatValue(sumRows(dash, "gifts"))}</td>
                    <td className="py-2.5 pr-5 pl-3 text-right font-semibold text-ink sm:pr-6">
                      {formatValue(sumRows(dash, "revenueUsd"), "usd")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          <Card>
            <CardTitle title="Most taken" hint="Every way in: claimed, bought, picked, gifted." />
            <BarList
              empty="Nothing taken from the shop in this period."
              rows={dash.topItems.map((item) => ({
                id: `${item.kind}:${item.id}`,
                label: (
                  <>
                    {item.name} <span className="text-muted">· {item.aisle}</span>
                  </>
                ),
                value: item.taken,
                note: item.bought ? `${item.bought} bought` : undefined,
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* Activity ----------------------------------------------------------- */}
      <Section id="activity" eyebrow="Activity" title="What people are doing" lede={`Everything people made or did, per ${per}.`}>
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["posts", "Posts"],
              ["comments", "Comments"],
              ["likes", "Likes"],
              ["follows", "Follows"],
              ["saves", "Saved to favorites"],
              ["messages", "Messages"],
              ["uploads", "Pieces added to galleries"],
            ] as [Metric, string][]
          ).map(([metric, label]) => (
            <li key={metric}>
              <Card className="!p-5">
                <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-ink">{formatValue(totals[metric])}</p>
                <ChangeNote change={change(metric)} against={against} />
                <div className="mt-3">
                  <TimeChart compact height={56} label={`${label} per ${per}`} points={points} series={[{ id: metric, label, color: S1, values: values(metric) }]} empty="None yet." />
                </div>
              </Card>
            </li>
          ))}
          <li>
            <Card className="h-full !p-5">
              <p className="text-[0.8125rem] font-medium text-muted">On the shelves today</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                <Fact label="Posts" value={formatValue(dash.shelves.posts)} />
                <Fact label="Gallery pieces" value={formatValue(dash.shelves.pieces)} />
                <Fact label="Characters" value={formatValue(dash.shelves.characters)} />
                <Fact label="Conversations" value={formatValue(dash.shelves.conversations)} />
              </dl>
            </Card>
          </li>
        </ul>
      </Section>

      {/* The team and the fine print ------------------------------------------ */}
      <Section id="notes" eyebrow="Fine print" title="How it's counted">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          <Card>
            <dl className="grid gap-4 text-sm leading-relaxed text-pretty">
              <Note term="Days">UTC days (a day ends at 21:00 in Brasília). Charts show a point a day up to 90 days, a week beyond.</Note>
              <Note term="Active">
                An account that opened Artiflow signed in that day (the browser says so once a day). Visitors who aren&apos;t
                signed in aren&apos;t counted here.
              </Note>
              <Note term="Paid through Artiflow">
                Commissions at their quoted price, the day they were paid; adoptables at their price, the day they were marked
                sold; shop items at catalog prices.
              </Note>
              <Note term="What we keep">
                {dash.feePercent}% of commissions and adoptables (the fee is set in src/lib/plans.ts; the receipt tries
                others), the whole shop, and each Flow+ member&apos;s plan by the day. Until checkout exists these are
                estimates.
              </Note>
              <Note term="Members">
                Counted back from today&apos;s members by when their plan started; cancellations aren&apos;t recorded yet, so
                past months only include people who are still members.
              </Note>
              <Note term="The team">
                &ldquo;Count the team&rdquo; off leaves out our own accounts, and every order one of us is on either side of.
              </Note>
            </dl>
          </Card>
          <Card>
            <CardTitle title="Who can see this" hint="Admins only. Add or remove with npm run team." />
            <ul className="grid gap-2">
              {dash.team.map((member) => (
                <li key={member.handle} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/${member.handle}`} className="min-w-0 truncate font-medium text-ink hover:text-ocean hover:underline">
                    {member.name} <span className="text-muted">@{member.handle}</span>
                  </Link>
                  <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-[0.6875rem] font-semibold text-muted capitalize">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>
    </>
  );
}

function Total({ value, change, against }: { value: number; change: ReturnType<typeof changeOf>; against: string }) {
  return (
    <div className="sm:text-right [&>p:last-child]:sm:justify-end">
      <p className="font-display text-xl font-extrabold text-ink">{formatValue(value, "usd")}</p>
      <ChangeNote change={change} against={against} />
    </div>
  );
}

function Chip({ label, n }: { label: string; n: number }) {
  return (
    <li className="rounded-full border border-border px-2.5 py-1 text-muted">
      {label} <span className="font-semibold text-ink tabular-nums">{formatValue(n)}</span>
    </li>
  );
}

function Note({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-semibold text-ink">{term}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}

/** One bar, split into parts of a whole, each part labelled under it. */
function Composition({ parts }: { parts: { id: string; label: string; n: number; color: string }[] }) {
  const whole = parts.reduce((sum, part) => sum + part.n, 0);
  const shown = parts.filter((part) => part.n > 0);
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px] bg-ice" role="img" aria-label={parts.map((p) => `${p.label}: ${p.n}`).join(", ")}>
        {shown.map((part) => (
          <span key={part.id} className="h-full first:rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(part.n / whole) * 100}%`, backgroundColor: part.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {parts.map((part) => (
          <li key={part.id} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: part.color }} />
            <span className="text-ink">{part.label}</span>
            <span className="font-semibold text-ink tabular-nums">{formatValue(part.n)}</span>
            <span className="text-muted tabular-nums">{whole ? formatPercent(part.n / whole) : "0%"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const sumRows = (dash: Dashboard, key: "claimed" | "bought" | "picks" | "gifts" | "revenueUsd") =>
  dash.shop.reduce((sum, row) => sum + row[key], 0);
