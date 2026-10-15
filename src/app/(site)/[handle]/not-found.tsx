import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/*
 * A page inside an artist's profile that isn't there (a character or a
 * collection that was renamed or removed). It renders in the profile's main
 * column, under the profile's own header; an unknown artist never gets here
 * (the layout's notFound() goes to the site's 404).
 */
export default function ProfileNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-5xl font-extrabold text-sky">404</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">This page isn&apos;t here</h1>
      <p className="mt-2 text-muted">It may have been renamed or taken down.</p>
      <Link href="/" className={buttonClasses({ className: "mt-6" })}>
        Back home
      </Link>
    </div>
  );
}
