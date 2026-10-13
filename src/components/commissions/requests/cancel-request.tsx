"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelRequest } from "@/app/(site)/request-actions";

/** Takes back a real request the artist hasn't answered, or declines their quote (the slot goes back to the service). */
export function CancelRequestButton({ id, artist, quote = false }: { id: string; artist: string; quote?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-semibold text-paper-muted underline-offset-4 hover:text-on-paper hover:underline"
      >
        {quote ? "Decline the quote" : "Take it back"}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="text-paper-muted">
        {quote ? `Say no to ${artist}'s quote? The request closes.` : `Withdraw it? ${artist} won't see it anymore.`}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await cancelRequest(id);
            if (!result.ok) return setError(result.error);
            router.refresh();
          })
        }
        className="h-8 rounded-full bg-danger px-3 text-xs font-bold text-white disabled:opacity-60"
      >
        {pending ? "One moment…" : quote ? "Decline" : "Withdraw"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs font-semibold text-paper-muted hover:text-on-paper">
        Keep it
      </button>
      {error && <span role="alert" className="w-full text-danger">{error}</span>}
    </span>
  );
}
