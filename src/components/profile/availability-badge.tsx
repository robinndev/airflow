import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AvailabilityBadge({ handle, note }: { handle: string; note: string }) {
  return (
    <Link
      href={`/${handle}/commissions`}
      className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-mint/50 bg-gradient-to-r from-mint/15 via-sky/10 to-white py-1.5 pr-3 pl-2 shadow-[0_0_0_4px_rgb(33_212_229/0.08)] transition-[border-color,box-shadow] hover:border-mint hover:shadow-[0_0_0_5px_rgb(33_212_229/0.14)]"
    >
      <span aria-hidden className="relative flex size-2.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
        <span className="relative inline-flex size-2.5 rounded-full bg-[#12b5c4]" />
      </span>
      <span className="min-w-0 text-sm leading-tight">
        <span className="font-semibold text-[#0b6f7a]">Available for new projects</span>
        <span className="hidden text-muted sm:inline"> · {note}</span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-3.5 shrink-0 text-[#0b6f7a] transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
