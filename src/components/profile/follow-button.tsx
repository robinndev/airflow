"use client";

import { Check, Plus } from "lucide-react";
import { useFollow, useFollowerCount } from "@/components/social/store";
import { buttonClasses } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";

/**
 * Follows an artist (visitors are sent to sign in and back). `initial` is the
 * server's answer when the page already knows it.
 */
export function FollowButton({
  handle,
  initial,
  compact = false,
}: {
  handle: string;
  initial?: boolean;
  compact?: boolean;
}) {
  const { following, toggle } = useFollow(handle, initial);

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow @${handle}` : `Follow @${handle}`}
      onClick={toggle}
      className={buttonClasses({
        variant: following ? "secondary" : "primary",
        size: compact ? "sm" : "md",
        className: compact ? "h-8 min-w-22 px-3 text-xs" : "min-w-28",
      })}
    >
      {following ? <Check aria-hidden /> : <Plus aria-hidden />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

/** A follower count that moves when the viewer follows from anywhere on the page. */
export function FollowerCount({ handle, count }: { handle: string; count: number }) {
  return <>{formatCompact(useFollowerCount(handle, count))}</>;
}
