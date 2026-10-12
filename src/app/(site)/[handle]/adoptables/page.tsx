import Link from "next/link";
import { Suspense } from "react";
import { AdoptShelf } from "@/components/listings/adopt-shelf";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { getAdoptables, getProfile, normalizeHandle } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Adoptables" };

export default function AdoptablesPage({ params }: PageProps<"/[handle]/adoptables">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Adoptables params={params} />
    </Suspense>
  );
}

async function Adoptables({ params }: Pick<PageProps<"/[handle]/adoptables">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const [profile, adoptables] = await Promise.all([getProfile(handle), getAdoptables(handle)]);
  if (!profile) return null;
  const available = adoptables.filter((a) => a.status !== "sold").length;

  return (
    <section>
      <SectionHeader
        handle={handle}
        title="Adoptables"
        description={
          adoptables.length
            ? `Ready-made characters: fixed price, one owner. ${available} looking for a home.`
            : "Ready-made characters, looking for a home."
        }
      />
      <Suspense>
        <OwnerNote handle={handle} />
      </Suspense>
      {adoptables.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">No adoptables right now</p>
          <p className="mt-1 text-sm text-muted">
            Follow {profile.displayName.split(" ")[0]} to hear when the next ones drop.
          </p>
        </div>
      ) : (
        <AdoptShelf artist={{ handle, name: profile.displayName, avatar: profile.avatar }} adoptables={adoptables} />
      )}
    </section>
  );
}

/** The artist sees where to manage these. */
async function OwnerNote({ handle }: { handle: string }) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-ice px-4 py-3 text-sm">
      <span className="text-ink">These are yours. Price, add or mark them adopted from your studio.</span>
      <Link href="/studio#ready-made" className={buttonClasses({ size: "sm" })}>
        Open your studio
      </Link>
    </div>
  );
}
