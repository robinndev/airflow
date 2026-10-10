"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyLinkButton({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/${handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Profile link copied" : "Copy profile link"}
      title={copied ? "Copied!" : "Copy profile link"}
      className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/20 group-data-[solid=true]/header:text-muted group-data-[solid=true]/header:hover:bg-ice group-data-[solid=true]/header:hover:text-ink"
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
    </button>
  );
}
