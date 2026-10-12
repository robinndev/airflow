"use client";

import { useEffect } from "react";
import { useUnreadCount } from "./store";

const PREFIX = /^\(\d+\) /;

/**
 * Unread conversations in the browser tab's title: "(2) Artiflow". Pages set
 * their own titles as you navigate, so it watches the title and puts the
 * count back.
 */
export function TabBadge() {
  const unread = useUnreadCount();

  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(PREFIX, "");
      const next = unread > 0 ? `(${unread}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(PREFIX, "");
    };
  }, [unread]);

  return null;
}
