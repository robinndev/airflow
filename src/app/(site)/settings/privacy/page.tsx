import type { Metadata } from "next";
import { Suspense } from "react";
import { LikeCountsSetting } from "@/components/settings/like-counts-setting";
import { LocalTimeSetting } from "@/components/settings/local-time-setting";
import { SettingsSheet, SheetFallback, SheetSection, SignInSheet } from "@/components/settings/sheet";
import { WhoSeesWhat } from "@/components/settings/who-sees-what";
import { getProfile } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { getViewerSettings, getViewerTimeZone } from "@/lib/settings/server";

export const metadata: Metadata = {
  title: "Privacy settings",
  description: "Like counts, your local time on your profile, and what other people can see.",
};

const TITLE = "Privacy";

export default function PrivacySettingsPage() {
  return (
    <Suspense fallback={<SheetFallback title={TITLE} />}>
      <Privacy />
    </Suspense>
  );
}

async function Privacy() {
  const viewer = await getViewer();
  const [settings, zone, profile] = viewer ? await Promise.all([getViewerSettings(), getViewerTimeZone(), getProfile(viewer.handle)]) : [null, null, null];
  if (!viewer || !settings || !profile) {
    return (
      <SignInSheet title={TITLE} next="/settings/privacy">
        Hide like counts, show your local time on your profile, and see what other people can see.
      </SignInSheet>
    );
  }

  return (
    <SettingsSheet title={TITLE} aside="no surprises">
      <SheetSection id="numbers" title="Numbers" description="Art isn't a scoreboard. Look at it without the counts if you like.">
        <LikeCountsSetting initialHidden={settings.hideLikeCounts} />
      </SheetSection>

      <SheetSection id="local-time" title="Your local time">
        <LocalTimeSetting initialZone={zone} name={profile.displayName} />
      </SheetSection>

      <SheetSection id="who-sees-what" title="Who sees what" description="How Artiflow works today, so you never have to guess.">
        <WhoSeesWhat />
      </SheetSection>
    </SettingsSheet>
  );
}
