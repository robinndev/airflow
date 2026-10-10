"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";

// UI-only until follows are persisted (Phase 2 in the blueprint).
export function FollowButton({ handle }: { handle: string }) {
  const [following, setFollowing] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow @${handle}` : `Follow @${handle}`}
      onClick={() => setFollowing((f) => !f)}
      className={buttonClasses({
        variant: following ? "secondary" : "primary",
        className: "min-w-28",
      })}
    >
      {following ? <Check aria-hidden /> : <Plus aria-hidden />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
