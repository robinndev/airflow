"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const QUARTER_HOUR = 15 * 60_000;

/**
 * Tells the back office this account was here today: one tiny call per
 * account per UTC day (`mark_active()`, *_admin_dashboard.sql), remembered
 * in localStorage. Checks again when the tab comes back or the day turns.
 */
export function ActivityPing({ viewer }: { viewer: string }) {
  useEffect(() => {
    const key = `artiflow:seen:${viewer}`;
    let busy = false;

    function mark() {
      if (busy || document.visibilityState !== "visible") return;
      const today = new Date().toISOString().slice(0, 10);
      try {
        if (localStorage.getItem(key) === today) return;
      } catch {
        // Storage blocked: ask the database; it keeps one row a day anyway.
      }
      busy = true;
      void send(today).finally(() => {
        busy = false;
      });
    }

    async function send(today: string) {
      const { error } = await supabaseBrowser().rpc("mark_active");
      if (error) return;
      try {
        localStorage.setItem(key, today);
      } catch {}
    }

    mark();
    document.addEventListener("visibilitychange", mark);
    const timer = window.setInterval(mark, QUARTER_HOUR);
    return () => {
      document.removeEventListener("visibilitychange", mark);
      window.clearInterval(timer);
    };
  }, [viewer]);

  return null;
}
