import Link from "next/link";
import { Suspense } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { AboutBoard } from "@/components/about/about-board";
import { SectionHeader } from "@/components/profile/section-header";
import { FeedSkeleton } from "@/components/profile/skeletons";
import { buttonClasses } from "@/components/ui/button";
import { getProfile, normalizeHandle } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

export const metadata = { title: "About" };

export default function AboutPage({ params }: PageProps<"/[handle]/about">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <About params={params} />
    </Suspense>
  );
}

async function About({ params }: Pick<PageProps<"/[handle]/about">, "params">) {
  const handle = normalizeHandle((await params).handle);
  const profile = await getProfile(handle);
  if (!profile) return null;
  const board = profile.about;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader handle={handle} title="About" description={`Everything ${profile.displayName} wants you to know.`} />
        <Suspense>
          <EditBoardLink handle={handle} />
        </Suspense>
      </div>

      {board && board.blocks.length > 0 ? (
        <AboutBoard board={board} />
      ) : (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
          <Sparkles aria-hidden className="mx-auto size-6 text-lilac" />
          <p className="mt-2 font-display text-lg font-bold text-ink">Nothing pinned here yet</p>
          <p className="mt-1 text-sm text-muted">Likes, DNIs, fun facts and doodles will show up here.</p>
        </div>
      )}
    </section>
  );
}

async function EditBoardLink({ handle }: { handle: string }) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  return (
    <Link href="/customize?tab=about" className={buttonClasses({ variant: "secondary", size: "sm", className: "mb-5" })}>
      <PenLine aria-hidden />
      Edit your board
    </Link>
  );
}
