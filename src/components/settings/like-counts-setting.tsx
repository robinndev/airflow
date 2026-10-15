"use client";

import { useState, useTransition } from "react";
import { saveHideLikeCounts } from "@/app/(site)/settings/actions";
import { applyHideLikes } from "@/lib/settings/prefs";
import { SwitchRow } from "./switch";

/** Like counts on or off for everything you look at (the page changes right away, then it's saved). */
export function LikeCountsSetting({ initialHidden }: { initialHidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function flip(show: boolean) {
    const before = hidden;
    setHidden(!show);
    applyHideLikes(!show);
    setError(null);
    start(async () => {
      const result = await saveHideLikeCounts(!show);
      if (result.ok) return;
      setHidden(before);
      applyHideLikes(before);
      setError(result.error);
    });
  }

  return (
    <>
      <SwitchRow
        label="Show like counts"
        hint="Off hides the numbers on posts and art everywhere you look, yours included. Hearts still work, and it follows you to every device."
        checked={!hidden}
        onChange={flip}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
