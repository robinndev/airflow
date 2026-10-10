import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-5xl font-extrabold text-sky">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">
          This artist doesn&apos;t exist (yet)
        </h1>
        <p className="mt-2 text-muted">The handle may have changed, or the profile was removed.</p>
        <Link href="/" className={buttonClasses({ className: "mt-6" })}>
          Back home
        </Link>
      </main>
    </>
  );
}
