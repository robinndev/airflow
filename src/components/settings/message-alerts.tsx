"use client";

import { Music } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { setAlertPrefs, useAlertPrefs } from "@/components/messages/prefs";
import { buttonClasses } from "@/components/ui/button";
import { previewChime } from "@/lib/messages/chime";
import { SwitchRow } from "./switch";

const noop = () => () => {};

/**
 * How new messages announce themselves in this browser: the studio chime
 * (each sender has their own tune; yours plays as a sample) and desktop
 * alerts while the tab is in the background. The same switches as the
 * inbox's header, kept in this browser.
 */
export function MessageAlerts({ handle }: { handle: string }) {
  const prefs = useAlertPrefs();
  const [blocked, setBlocked] = useState(false);
  // Desktop alerts exist only in some browsers (not in iOS Safari tabs, say).
  const supported = useSyncExternalStore(noop, () => typeof Notification !== "undefined", () => true);
  const desktopOn = prefs.desktop && supported && !blocked;

  async function toggleDesktop(on: boolean) {
    if (!on) return setAlertPrefs({ desktop: false });
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") setAlertPrefs({ desktop: true });
    else setBlocked(true);
  }

  return (
    <div className="divide-y divide-border/70">
      <SwitchRow
        label="Studio chime"
        hint="A little tune when a letter arrives and the chat isn't open. Every sender has their own."
        checked={prefs.sound}
        onChange={(on) => {
          setAlertPrefs({ sound: on });
          if (on) void previewChime(handle);
        }}
      >
        <button type="button" onClick={() => void previewChime(handle)} className={buttonClasses({ variant: "ghost", size: "sm", className: "mt-2 -ml-3" })}>
          <Music aria-hidden />
          Play your studio&apos;s tune
        </button>
      </SwitchRow>
      <SwitchRow
        label="Desktop alerts"
        hint={
          !supported
            ? "This browser can't show them."
            : blocked
              ? "Your browser blocks alerts from Artiflow. Allow them in its site settings, then try again."
              : "A note from your system when a message arrives while this tab is in the background."
        }
        checked={desktopOn}
        disabled={!supported}
        onChange={(on) => void toggleDesktop(on)}
      />
    </div>
  );
}
