"use client";

import { BellOff, BellRing, Volume2, VolumeX } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { previewChime } from "@/lib/messages/chime";
import { setAlertPrefs, useAlertPrefs } from "./prefs";
import { useChatState } from "./store";

const noop = () => () => {};

/**
 * How new messages announce themselves: the studio chime (turning it on rings
 * your own studio's tune as a sample) and desktop alerts for when the tab is
 * in the background (asks the browser's permission the first time).
 */
export function AlertToggles() {
  const prefs = useAlertPrefs();
  const { viewer } = useChatState();
  const [blocked, setBlocked] = useState(false);
  // Desktop alerts exist only in some browsers (not in iOS Safari tabs, say).
  const supported = useSyncExternalStore(noop, () => typeof Notification !== "undefined", () => false);
  const desktopOn = prefs.desktop && supported && !blocked;

  async function toggleDesktop() {
    if (desktopOn) return setAlertPrefs({ desktop: false });
    const permission =
      Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") setAlertPrefs({ desktop: true });
    else setBlocked(true);
  }

  const button =
    "grid size-8 place-items-center rounded-full transition-colors hover:bg-ice aria-pressed:text-ink [&_svg]:size-4";

  return (
    <div className="flex items-center gap-0.5 text-muted">
      <button
        type="button"
        aria-pressed={prefs.sound}
        aria-label="Message sound"
        title={prefs.sound ? "Message sound is on" : "Message sound is off"}
        onClick={() => {
          const next = !prefs.sound;
          setAlertPrefs({ sound: next });
          if (next) void previewChime(viewer?.handle ?? "artiflow");
        }}
        className={button}
      >
        {prefs.sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      </button>
      {supported && (
        <button
          type="button"
          aria-pressed={desktopOn}
          aria-label="Desktop alerts"
          title={
            blocked
              ? "Your browser blocks alerts from Artiflow: allow them in its site settings"
              : desktopOn
                ? "Desktop alerts are on (when this tab is in the background)"
                : "Turn on desktop alerts for when this tab is in the background"
          }
          onClick={() => void toggleDesktop()}
          className={`${button} ${blocked ? "text-danger" : ""}`}
        >
          {desktopOn ? <BellRing aria-hidden /> : <BellOff aria-hidden />}
        </button>
      )}
    </div>
  );
}
