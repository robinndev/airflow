import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AvailabilityBadge({ handle, note }: { handle: string; note: string }) {
  return (
    <Link
      href={`/${handle}/commissions`}
      title={note}
      className="group inline-flex items-center gap-2 rounded-full bg-mint/15 py-1 pr-2.5 pl-2.5 text-xs font-semibold text-mint-ink ring-1 ring-mint/40 transition-[background-color,box-shadow] ring-inset hover:bg-mint/25 hover:ring-mint/70"
    >
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
        <span className="relative inline-flex size-2 rounded-full bg-mint-dot" />
      </span>
      Available for new projects
      <span className="sr-only"> — {note}</span>
      <ArrowRight
        aria-hidden
        className="-ml-0.5 size-3 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
