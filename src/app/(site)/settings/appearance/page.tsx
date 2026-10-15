import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSetting, TileSizeSetting } from "@/components/settings/appearance-settings";
import { SettingsSheet, SheetSection } from "@/components/settings/sheet";

export const metadata: Metadata = {
  title: "Appearance",
  description: "Aqua or Ember, and how big Explore's wall hangs its pieces.",
};

/** Per browser, so it works signed out too, and the whole page prerenders. */
export default function AppearanceSettingsPage() {
  return (
    <SettingsSheet title="Appearance" aside="saved on this device">
      <SheetSection id="theme" title="Theme" description="How Artiflow feels. Artists' profiles keep their own colors on top of either one.">
        <ThemeSetting />
      </SheetSection>
      <SheetSection
        id="wall"
        title="Explore's wall"
        description={
          <>
            How big pieces hang on{" "}
            <Link href="/explore" className="font-semibold text-ink underline decoration-border underline-offset-2 hover:decoration-ocean">
              Explore
            </Link>
            . Art is never cropped or blown up past its own size, whichever you pick.
          </>
        }
      >
        <TileSizeSetting />
      </SheetSection>
    </SettingsSheet>
  );
}
