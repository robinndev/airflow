import Link from "next/link";
import { Suspense } from "react";
import { CommissionSummary } from "@/components/commissions/commission-summary";
import { CommissionDialog } from "@/components/commissions/commission-dialog";
import { CustomServiceRow, ServiceRow } from "@/components/commissions/service-row";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { getProfile, getReviews, getServices, normalizeHandle } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Commissions" };

export default function CommissionsPage({ params }: PageProps<"/[handle]/commissions">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Commissions params={params} />
    </Suspense>
  );
}

async function Commissions({ params }: Pick<PageProps<"/[handle]/commissions">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const [profile, services, reviews] = await Promise.all([
    getProfile(handle),
    getServices(handle),
    getReviews(handle),
  ]);
  if (!profile) return null;
  const { commissions } = profile;

  return (
    <section aria-labelledby="services-heading">
      <SectionHeader
        handle={handle}
        title="Commissions"
        description={`Pick a service or ask ${profile.displayName.split(" ")[0]} for something custom.`}
      />
      <Suspense>
        <OwnerNote handle={handle} empty={services.length === 0} />
      </Suspense>
      <CommissionSummary commissions={commissions} />

      <h3 id="services-heading" className="sr-only">
        Services
      </h3>
      <div className="mt-5 grid gap-4">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} status={commissions.status} />
        ))}
        <CustomServiceRow artistName={profile.displayName} status={commissions.status} />
      </div>

      <CommissionDialog
        artist={{
          handle,
          displayName: profile.displayName,
          avatar: profile.avatar,
          isPro: profile.plan === "pro",
        }}
        status={commissions.status}
        slotsLeft={Math.max(0, commissions.slotsTotal - commissions.slotsTaken)}
        note={commissions.note}
        rating={commissions.rating}
        terms={commissions.terms}
        services={services}
        reviews={reviews}
      />
    </section>
  );
}

/** The artist sees where to list and manage services. */
async function OwnerNote({ handle, empty }: { handle: string; empty: boolean }) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card bg-ice px-4 py-3 text-sm">
      <span className="text-ink">
        {empty ? "List your first service: packages, prices, slots and examples." : "Open, waitlist or close each service, and change prices, from your studio."}
      </span>
      <Link href="/studio" className={buttonClasses({ size: "sm" })}>
        {empty ? "New service" : "Open your studio"}
      </Link>
    </div>
  );
}
