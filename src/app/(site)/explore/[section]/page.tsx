import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";

// Placeholder for discovery (blueprint §7). Static route, so it wins over /[handle].
const SECTIONS: Record<string, { title: string; description: string }> = {
  popular: { title: "Popular characters", description: "What the community is loving this week." },
  recent: { title: "Recent characters", description: "Freshly uploaded, newest first." },
  search: { title: "Character search", description: "Filter by tags, species, traits and price." },
  literatures: { title: "Literatures", description: "Stories, lore and worldbuilding docs." },
  worlds: { title: "Worlds", description: "Shared universes and the characters who live there." },
  commissions: { title: "Open commissions", description: "Artists taking requests right now." },
  adoptables: { title: "Adoptables", description: "Original characters looking for a new home." },
  saved: { title: "Saved", description: "Posts, services and characters you bookmarked." },
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default function ExplorePage({ params }: PageProps<"/explore/[section]">) {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <ExploreSection params={params} />
      </Suspense>
    </>
  );
}

async function ExploreSection({ params }: Pick<PageProps<"/explore/[section]">, "params">) {
  const section = SECTIONS[(await params).section];
  if (!section) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="rounded-full bg-ice px-3 py-1 text-xs font-semibold tracking-wide text-ocean-ink uppercase inline-block">
        Coming soon
      </p>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink">
        {section.title}
      </h1>
      <p className="mt-2 text-muted">{section.description}</p>
      <Link href="/mira" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>
        Back to a profile
      </Link>
    </main>
  );
}
