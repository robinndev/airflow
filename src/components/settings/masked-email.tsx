"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskEmail } from "@/lib/settings/account";

/** Your email, half hidden (streams, screenshots) until you ask to see it. */
export function MaskedEmail({ email, className = "" }: { email: string; className?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className={`inline-flex max-w-full items-center gap-1 ${className}`}>
      <span className="truncate" data-testid="account-email">
        {shown ? email : maskEmail(email)}
      </span>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide your email" : "Show your email"}
        aria-pressed={shown}
        className="grid size-7 shrink-0 place-items-center rounded-full opacity-70 transition-[opacity,background-color] hover:bg-black/5 hover:opacity-100 [&_svg]:size-3.5"
      >
        {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </button>
    </span>
  );
}
