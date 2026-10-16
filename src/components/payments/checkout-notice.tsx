"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { showToast } from "@/components/favorites/toast-events";

/*
 * Back from Stripe's payment page (/checkout/return adds `?payment=` on
 * /requests, `?adoption=` on an artist's adoptables): says how it went once,
 * then tidies the address.
 */

const MESSAGES = {
  payment: {
    paid: "Paid! The artist has been told. Follow it here.",
    refunded: "The order moved on before your payment landed, so it went straight back to your card.",
    cancelled: "Payment cancelled. Nothing was charged.",
    pending: "Stripe is still confirming your payment. It shows here as soon as it does.",
  },
  adoption: {
    paid: "It's yours! The artist has been told and will send you the files.",
    refunded: "Someone adopted it a moment before you. Your payment went straight back to your card.",
    cancelled: "Payment cancelled. Nothing was charged.",
    pending: "Stripe is still confirming your payment. It shows here as soon as it does.",
  },
} as const;

export function CheckoutNotice({ param }: { param: keyof typeof MESSAGES }) {
  const value = useSearchParams().get(param);
  useEffect(() => {
    if (!value) return;
    const message = MESSAGES[param][value as keyof (typeof MESSAGES)[typeof param]];
    if (message) showToast({ message });
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    history.replaceState(null, "", url);
  }, [param, value]);
  return null;
}
