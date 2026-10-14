"use client";

import Link from "next/link";
import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { Stamp } from "@/components/explore/stamp";
import { Avatar } from "@/components/ui/avatar";
import { inviteHref, type HeldCode } from "@/lib/artists/codes";

/*
 * The artist codes you hold, as a strip of admit-one tickets. A code to give
 * shows big, with Copy code and Copy invite link; a used one is stamped
 * USED, with who used it and when.
 */

const NOTCHES = {
  maskImage: "radial-gradient(circle at 0 50%, transparent 8px, black 8.5px), radial-gradient(circle at 100% 50%, transparent 8px, black 8.5px)",
  maskComposite: "intersect",
  WebkitMaskImage: "radial-gradient(circle at 0 50%, transparent 8px, black 8.5px), radial-gradient(circle at 100% 50%, transparent 8px, black 8.5px)",
  WebkitMaskComposite: "source-in",
} as const;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function CodeTickets({ codes }: { codes: HeldCode[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {codes.map((held, i) => (
        <li key={held.code}>
          <Ticket held={held} number={i + 1} total={codes.length} />
        </li>
      ))}
    </ol>
  );
}

function Ticket({ held, number, total }: { held: HeldCode; number: number; total: number }) {
  const used = held.usedAt !== null;
  return (
    <article
      aria-label={used ? `Code ${number}, used` : `Code ${number}, to give`}
      data-part="artist-code"
      data-used={used || undefined}
      className={`relative flex h-full rounded-[12px] text-on-paper shadow-soft ${used ? "bg-paper/70" : "bg-paper"}`}
      style={NOTCHES}
    >
      {/* The stub: which ticket of the roll. */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r-2 border-dashed border-paper-muted/25 px-2 py-4 text-center">
        <span className="text-[0.5625rem] font-bold tracking-[0.16em] text-paper-muted uppercase">Admit</span>
        <span className="font-display text-lg leading-none font-extrabold">one</span>
        <span className="mt-1 text-[0.625rem] font-semibold text-paper-muted tabular-nums">
          {number}/{total}
        </span>
      </div>

      <div className="min-w-0 flex-1 p-4 pl-4">
        <p className={`font-mono text-xl font-bold tracking-[0.2em] ${used ? "text-paper-muted line-through decoration-2" : ""}`}>{held.code}</p>
        {used ? (
          <div className="mt-3 flex items-center gap-3">
            <Stamp tone="like" onPaper className="-rotate-6">
              Used
            </Stamp>
            {held.usedBy ? (
              <Link href={`/${held.usedBy.handle}`} className="flex min-w-0 items-center gap-2 rounded-input hover:underline">
                <Avatar image={held.usedBy.avatar} size={28} className="size-7" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-semibold">@{held.usedBy.handle}</span>
                  <span className="block text-xs text-paper-muted">{day(held.usedAt!)}</span>
                </span>
              </Link>
            ) : (
              <span className="text-xs text-paper-muted">{day(held.usedAt!)} · account since deleted</span>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Stamp tone="mint" onPaper className="-rotate-3">
              To give
            </Stamp>
            <CopyButton label="Copy code" copied="Code copied" value={() => held.code} icon="code" />
            <CopyButton label="Copy invite link" copied="Link copied" value={() => new URL(inviteHref(held.code), window.location.origin).toString()} icon="link" />
          </div>
        )}
      </div>
    </article>
  );
}

function CopyButton({ label, copied, value, icon }: { label: string; copied: string; value: () => string; icon: "code" | "link" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value());
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      // Clipboard blocked: the code is printed right there.
    }
  }
  const Icon = done ? Check : icon === "code" ? Copy : Link2;
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-paper-muted/25 px-3 text-xs font-semibold transition-colors hover:border-ocean hover:text-ocean [&_svg]:size-3.5"
    >
      <Icon aria-hidden />
      {done ? copied : label}
    </button>
  );
}
