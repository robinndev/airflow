import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";

// Placeholders for what's still to come (blueprint §7). Search, trending,
// open studios, open commissions, adoptables and recent have their own
// routes, which win over this one.
const SECTIONS: Record<string, { title: string; description: string }> = {
  literatures: { title: "Literatures", description: "Stories, lore and worldbuilding docs." },
  worlds: { title: "Worlds", description: "Shared universes and the characters who live there." },
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
      <Link href="/explore/search" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>
        Search what&apos;s open
      </Link>
    </main>
  );
}
