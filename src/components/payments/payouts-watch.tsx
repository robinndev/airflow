"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY = 15_000;
// Ten minutes of looking. Stripe's usually done within a minute; past this, the next visit shows it.
const TRIES = 40;

/** While Stripe reviews an artist's details, asks the server again so "Payouts are on" shows up on its own. */
export function PayoutsWatch() {
  const router = useRouter();
  useEffect(() => {
    let left = TRIES;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      left -= 1;
      if (left < 0) clearInterval(timer);
      else router.refresh();
    }, EVERY);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
