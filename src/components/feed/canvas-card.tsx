import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import type { ImageAsset, PostKind } from "@/lib/profile/types";
import { PROCESS, STAGES } from "./stages";

/**
 * The blank canvas at the top of the feed, drawn the same way for everyone so
 * nothing shifts when the feed streams in: the composer's closed state
 * (artists), an invitation to sign in (visitors) and the loading shell.
 * `pick` opens the composer with a stage; `href` sends visitors to sign in.
 */
export function CanvasCard({
  avatar,
  prompt,
  pick,
  href,
}: {
  avatar?: ImageAsset;
  prompt: string;
  pick?: (kind: PostKind) => void;
  href?: string;
}) {
  const chip =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 text-xs font-semibold text-ink transition-colors hover:border-ocean/40 hover:text-ocean-ink [&_svg]:size-3.5";
  // Visitors' and the loading shell's controls are links (or nothing) instead of buttons.
  const action = (kind: PostKind, className: string, children: ReactNode) =>
    pick ? (
      <button type="button" onClick={() => pick(kind)} className={className}>
        {children}
      </button>
    ) : href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <span aria-hidden className={className}>
        {children}
      </span>
    );

  return (
    <div className="group relative rounded-panel border-2 border-dashed border-ink/15 bg-surface/45 p-4 backdrop-blur-sm transition-colors hover:border-ocean/40 hover:bg-surface/70 sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        {avatar ? (
          <Avatar image={avatar} size={48} className="size-11 ring-2 ring-surface sm:size-12" />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ice text-muted ring-2 ring-surface sm:size-12">
            <UserRound aria-hidden className="size-5" />
          </span>
        )}
        {action(
          "finished",
          "flex h-12 min-w-0 flex-1 items-center rounded-full border border-border bg-surface px-5 text-left text-[0.9375rem] text-muted transition-colors after:absolute after:inset-0 after:rounded-panel group-hover:border-ocean/30",
          <span className="truncate">{prompt}</span>,
        )}
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5 sm:pl-16">
        {PROCESS.map((stage) => {
          const { icon: Icon, label } = STAGES[stage];
          return (
            <span key={stage} className="contents">
              {action(
                stage,
                chip,
                <>
                  <Icon aria-hidden />
                  {label}
                </>,
              )}
            </span>
          );
        })}
        {action(
          "finished",
          buttonClasses({ size: "sm", className: "ml-auto px-4" }),
          <>
            <Plus aria-hidden />
            {href ? "Sign in to post" : "Post"}
          </>,
        )}
      </div>
    </div>
  );
}
