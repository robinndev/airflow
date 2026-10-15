import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Tape } from "@/components/explore/doodles";
import { sinceMonth } from "@/components/notifications/time";
import { EditProfileButton } from "@/components/profile/edit-profile-dialog";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { customizationFor } from "@/lib/customization/model";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { getAccountDetails } from "@/lib/settings/server";
import { MaskedEmail } from "./masked-email";

/*
 * The inside cover of your sketchbook: whose it is, and where to send it if
 * it's found (your email, half hidden). Printed on paper, light in both
 * themes, with your profile's buttons underneath.
 */

const caps = "text-[0.625rem] font-bold tracking-[0.16em] text-paper-muted uppercase";
const chip = "inline-flex h-6 items-center rounded-full border border-paper-muted/25 px-2 text-[0.6875rem] font-semibold text-on-paper";

export async function InsideCover() {
  const viewer = await getViewer();
  const [profile, account] = viewer ? await Promise.all([getProfile(viewer.handle), getAccountDetails()]) : [null, null];

  if (!profile) {
    return (
      <Cover>
        <p className={caps}>This sketchbook belongs to</p>
        <p aria-hidden className="mt-5 border-b-2 border-dashed border-paper-muted/35 lg:mt-6" />
        <p className="mt-4 hidden text-sm text-paper-muted lg:block">Sign in and it&apos;s yours. Theme and wall size work without an account.</p>
      </Cover>
    );
  }

  const status = profile.artist ? (profile.artist.verifiedAt ? "Verified artist" : "Artist") : "Collector";
  return (
    <div>
      <Cover>
        <p className={caps}>This sketchbook belongs to</p>
        <div className="mt-3 flex items-center gap-3">
          <Avatar image={profile.avatar} size={56} className="size-14 ring-[3px] ring-paper" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-tight font-extrabold text-on-paper">{profile.displayName}</p>
            <p className="truncate text-sm text-paper-muted">@{profile.handle}</p>
          </div>
        </div>
        {account?.email && (
          <div className="mt-4 hidden border-t border-dashed border-paper-muted/30 pt-3 lg:block">
            <p className={caps}>If found, please return to</p>
            <MaskedEmail email={account.email} className="mt-0.5 -mr-1.5 text-sm font-medium text-on-paper" />
          </div>
        )}
        <p className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
          <span className={chip}>Since {sinceMonth(profile.joinedAt)}</span>
          <Link href="/plans" className={`${chip} hover:border-ocean/50`}>
            {profile.plan === "pro" ? "Flow+" : "Free plan"}
          </Link>
          <Link href="/codes" className={`${chip} hover:border-ocean/50`}>
            {status}
          </Link>
        </p>
      </Cover>
      <div className="mt-3 hidden flex-wrap gap-2 lg:flex">
        <EditProfileButton
          handle={profile.handle}
          avatar={profile.avatar}
          custom={customizationFor(profile)}
          initial={{
            displayName: profile.displayName,
            headline: profile.headline,
            bio: profile.bio,
            pronouns: profile.pronouns ?? "",
            location: profile.location ?? "",
            links: profile.links.map(({ url, label }) => ({ url, label })),
            draws: profile.draws,
          }}
        />
        <Link href={`/${profile.handle}`} className={buttonClasses({ variant: "ghost" })}>
          Your profile
          <ArrowUpRight aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Cover({ children }: { children: ReactNode }) {
  return (
    <div className="relative pt-2">
      <Tape tone="lilac" className="-top-1 left-8 -rotate-3" />
      <section aria-label="Your account" className="dot-paper relative rounded-card px-4 pt-5 pb-4 text-on-paper shadow-soft [background-size:14px_14px] lg:px-5 lg:pt-6 lg:pb-5">
        {children}
      </section>
    </div>
  );
}

export function CoverFallback() {
  return <div className="skeleton h-28 rounded-card bg-ice lg:h-56" />;
}
