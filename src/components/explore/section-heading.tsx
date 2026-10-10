import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { HandNote } from "./doodles";

/** Editorial section header: small-caps kicker, big title, a handwritten aside. */
export function SectionHeading({
  id,
  kicker,
  title,
  note,
  action,
  children,
}: {
  id: string;
  kicker?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl min-w-0">
        {kicker && (
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-muted uppercase">{kicker}</p>
        )}
        <h2
          id={id}
          className="mt-2 font-display text-[2rem] leading-[1.04] font-extrabold tracking-tight text-balance text-ink sm:text-[2.625rem]"
        >
          {title}
        </h2>
        {note && <HandNote className="mt-2 -rotate-2 sm:text-2xl">{note}</HandNote>}
        {children}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2.5 text-sm font-semibold text-ink"
        >
          <span className="underline-offset-4 group-hover:underline">{action.label}</span>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-on-ink transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      )}
    </div>
  );
}
