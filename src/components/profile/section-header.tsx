import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SectionHeader({
  handle,
  title,
  description,
}: {
  handle: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <Link
        href={`/${handle}`}
        className="inline-flex items-center gap-1.5 rounded-input text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to posts
      </Link>
      <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
