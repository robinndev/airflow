import { Suspense } from "react";
import { Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { CommissionStatusPill } from "@/components/profile/commission-status-pill";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { formatUsd } from "@/lib/format";
import { getProfile, normalizeHandle } from "@/lib/profile/queries";

export const metadata = { title: "Commissions" };

export default function CommissionsPage({ params }: PageProps<"/[handle]/commissions">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Commissions params={params} />
    </Suspense>
  );
}

async function Commissions({
  params,
}: Pick<PageProps<"/[handle]/commissions">, "params">) {
  const profile = await getProfile(normalizeHandle((await params).handle));
  if (!profile) return null;
  const { commissions } = profile;

  return (
    <section>
      <SectionHeader
        handle={profile.handle}
        title="Commissions"
        description="Full service pages with examples, options, terms and checkout are coming next."
      />
      <div className="rounded-card border border-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CommissionStatusPill status={commissions.status} />
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Clock aria-hidden className="size-4" />
            Usually delivered in {commissions.turnaround}
          </span>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {commissions.types.map((type) => (
            <li
              key={type}
              className="flex items-center justify-between rounded-[12px] border border-border px-4 py-3.5"
            >
              <span className="font-medium text-ink">{type}</span>
              <span className="text-sm text-muted">
                from{" "}
                <span className="font-semibold text-ink">
                  {formatUsd(commissions.startingPriceUsd)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" disabled className={buttonClasses({ className: "mt-6" })}>
          Request form coming soon
        </button>
      </div>
    </section>
  );
}
