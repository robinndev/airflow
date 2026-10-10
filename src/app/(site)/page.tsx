import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";

// Temporary landing until discovery is built — points at the demo profiles.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <p className="rounded-full bg-ice px-3 py-1 text-xs font-semibold tracking-wide text-[#0670d0] uppercase">
          Create. Share. Sell.
        </p>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-balance text-ink sm:text-5xl">
          A home for digital artists and the characters they create.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Portfolios, original characters, adoptables and commissions — in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/mira" className={buttonClasses({ size: "lg" })}>
            View a Pro profile
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/kai" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            View a free profile
          </Link>
        </div>
      </main>
    </>
  );
}
