import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessageAlerts } from "@/components/settings/message-alerts";
import { NoticePrefs } from "@/components/settings/notice-prefs";
import { SettingsSheet, SheetFallback, SheetSection, SignInSheet } from "@/components/settings/sheet";
import { getViewer } from "@/lib/session";
import { getViewerSettings } from "@/lib/settings/server";

export const metadata: Metadata = {
  title: "Notification settings",
  description: "Choose what gets signed into your guest book, and how messages announce themselves.",
};

const TITLE = "Notifications";

export default function NotificationSettingsPage() {
  return (
    <Suspense fallback={<SheetFallback title={TITLE} />}>
      <Notifications />
    </Suspense>
  );
}

async function Notifications() {
  const [viewer, settings] = await Promise.all([getViewer(), getViewerSettings()]);
  if (!viewer || !settings) {
    return (
      <SignInSheet title={TITLE} next="/settings/notifications">
        Choose what gets signed into your guest book, and how new messages announce themselves.
      </SignInSheet>
    );
  }

  return (
    <SettingsSheet title={TITLE} aside="your guest book, your call">
      <SheetSection
        id="guest-book"
        title="In your guest book"
        description={
          <>
            What gets signed into your{" "}
            <Link href="/notifications" className="font-semibold text-ink underline decoration-border underline-offset-2 hover:decoration-ocean">
              guest book
            </Link>{" "}
            and counted on the bell. Turning one off stops new ones; what&apos;s already there stays.
          </>
        }
      >
        <NoticePrefs initialMuted={settings.muted} />
      </SheetSection>

      <SheetSection id="email" title="By email">
        <p className="rounded-card border border-dashed border-border px-4 py-3 text-sm text-muted">
          Email notifications come once Artiflow sends from its own address. Until then, everything lands in your guest book.
        </p>
      </SheetSection>

      <SheetSection id="messages" title="Messages on this device" description="These stay in this browser, so each device can have its own.">
        <MessageAlerts handle={viewer.handle} />
      </SheetSection>
    </SettingsSheet>
  );
}
