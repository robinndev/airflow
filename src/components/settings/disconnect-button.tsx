"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { disconnectProvider } from "@/app/(site)/settings/actions";
import { buttonClasses } from "@/components/ui/button";

/** Disconnect, asked twice. The last way into an account can't go. */
export function DisconnectButton({ provider, name, last }: { provider: string; name: string; last: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (last) return <span className="text-sm text-muted">Your only way in</span>;

  function disconnect() {
    start(async () => {
      const result = await disconnectProvider(provider);
      if (!result.ok) return setError(result.error);
      setAsking(false);
      router.refresh();
    });
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
        Disconnect
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {error ? (
        <span role="alert" className="max-w-56 text-right text-xs text-danger">
          {error}
        </span>
      ) : (
        <span className="text-xs text-muted">You won&apos;t sign in with {name} anymore.</span>
      )}
      <button
        type="button"
        onClick={disconnect}
        disabled={pending}
        className={buttonClasses({ variant: "secondary", size: "sm", className: "text-danger hover:border-danger/40" })}
      >
        {pending ? "Disconnecting…" : "Disconnect"}
      </button>
      <button type="button" onClick={() => (setAsking(false), setError(null))} className={buttonClasses({ variant: "ghost", size: "sm" })}>
        Keep it
      </button>
    </span>
  );
}
