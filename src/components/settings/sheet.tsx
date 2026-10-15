import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { HandNote } from "@/components/explore/doodles";
import { buttonClasses } from "@/components/ui/button";

/*
 * A settings page is a sheet in the sketchbook's binder: punched down the
 * left edge (the index tabs sit beside it), one section per topic, dashed
 * rules between them.
 */

export function SettingsSheet({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <article className="grain relative rounded-panel rounded-tl-[10px] border border-border bg-surface shadow-soft lg:pl-8">
      {/* Binder holes, punched through the paper (the canvas shows through). */}
      <span aria-hidden className="absolute top-10 bottom-10 left-3.5 hidden flex-col justify-between lg:flex">
        {[0, 1, 2].map((hole) => (
          <span key={hole} className="block size-3.5 rounded-full bg-canvas shadow-[inset_0_1px_2px_rgb(var(--shadow-rgb)/0.25)]" />
        ))}
      </span>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-dashed border-border px-5 pt-6 pb-4 sm:px-8 sm:pt-7">
        <h2 className="font-display text-[1.625rem] leading-tight font-extrabold tracking-tight text-ink">{title}</h2>
        {aside && (
          <HandNote tone="lilac" className="-rotate-2 text-xl">
            {aside}
          </HandNote>
        )}
      </header>
      <div className="divide-y divide-dashed divide-border">{children}</div>
    </article>
  );
}

export function SheetSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-24 px-5 py-6 sm:px-8">
      <h3 id={id ? `${id}-heading` : undefined} className="font-display text-lg font-bold tracking-tight text-ink">
        {title}
      </h3>
      {description && <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A line inside a section: label and value on the left, its action on the right. */
export function SheetRow({ label, children, action }: { label: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 py-3.5 first:border-t-0 first:pt-1">
      <div className="min-w-0">
        <div className="text-[0.9375rem] font-semibold text-ink">{label}</div>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** An outcome at the top of a sheet (a link opened, an account connected). */
export function SheetNotice({ tone, children }: { tone: "ok" | "problem"; children: ReactNode }) {
  return (
    <p
      role={tone === "problem" ? "alert" : "status"}
      className={`mx-5 mt-5 flex items-start gap-2 rounded-input px-3.5 py-3 text-sm sm:mx-8 ${
        tone === "ok" ? "bg-mint/12 text-ink" : "bg-danger/8 text-danger"
      }`}
    >
      {tone === "ok" ? (
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-mint-ink dark:text-mint" />
      ) : (
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  );
}

/** Visitors: the sheet asks them to sign in first. */
export function SignInSheet({ title, next, children }: { title: string; next: string; children: ReactNode }) {
  return (
    <SettingsSheet title={title}>
      <div className="px-5 py-12 text-center sm:px-8">
        <p className="font-display text-lg font-bold text-ink">Sign in to change these</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={buttonClasses({ variant: "secondary" })}>
            Sign in
          </Link>
          <Link href="/join" className={buttonClasses()}>
            Create account
          </Link>
        </div>
      </div>
    </SettingsSheet>
  );
}

/** The sheet's outline while the viewer's settings load. */
export function SheetFallback({ title }: { title: string }) {
  return (
    <SettingsSheet title={title}>
      {[0, 1, 2].map((section) => (
        <div key={section} className="px-5 py-6 sm:px-8">
          <div className="skeleton h-5 w-40 rounded-full bg-ice" />
          <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-full bg-ice" />
          <div className="skeleton mt-5 h-11 rounded-input bg-ice" />
        </div>
      ))}
    </SettingsSheet>
  );
}
