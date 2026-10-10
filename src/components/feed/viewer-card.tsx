import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ProStar } from "@/components/ui/pro-badge";
import { buttonClasses } from "@/components/ui/button";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";

/** Account chip pinned to the bottom of the left column. Reads cookies — use inside <Suspense>. */
export async function ViewerCard() {
  const viewer = await getViewer();
  const profile = viewer ? await getProfile(viewer.handle) : null;

  if (!profile) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-4">
        <p className="font-display font-extrabold text-ink">New to Artiflow?</p>
        <p className="mt-1 text-sm text-muted">Follow artists, save art and request commissions.</p>
        <button type="button" className={buttonClasses({ size: "sm", className: "mt-3 w-full" })}>
          Create an account
        </button>
      </div>
    );
  }

  return (
    <Link
      href={`/${profile.handle}`}
      className="flex items-center gap-3 rounded-full p-2.5 transition-colors hover:bg-surface"
    >
      <span className="relative shrink-0">
        <Avatar image={profile.avatar} size={40} className="size-10" />
        {profile.plan === "pro" && <ProStar size="sm" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{profile.displayName}</span>
        <span className="block truncate text-xs text-muted">@{profile.handle}</span>
      </span>
      <Ellipsis aria-hidden className="size-5 shrink-0 text-muted" />
    </Link>
  );
}
