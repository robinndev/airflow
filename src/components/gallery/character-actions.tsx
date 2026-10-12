"use client";

import { Bookmark, Check, Link2 } from "lucide-react";
import { useState } from "react";
import { useFavorite } from "@/components/favorites/store";
import { buttonClasses } from "@/components/ui/button";

/** Saves the character themselves (not just their artist) to the viewer's moodboard. */
export function SaveCharacterButton({ id, name }: { id: string; name: string }) {
  const { saved, toggle } = useFavorite({ kind: "character", id, title: name });
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={toggle}
      className={buttonClasses({ variant: saved ? "soft" : "primary", className: saved ? "text-like!" : "" })}
    >
      <Bookmark aria-hidden className={saved ? "animate-pop fill-current" : ""} />
      {saved ? "Saved" : `Save ${name}`}
    </button>
  );
}

/** Copies the page's address. */
export function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the address bar still has it.
    }
  }
  return (
    <button type="button" onClick={copy} className={buttonClasses({ variant: "secondary" })}>
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Their colors as a ref sheet prints them: big swatches, the hex under each. Click to copy. */
export function RefSwatches({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((current) => (current === hex ? null : current)), 1400);
    } catch {
      // Clipboard blocked: the hex is printed right there.
    }
  }
  return (
    <>
      <ul className="flex flex-wrap gap-2.5">
        {colors.map((hex) => (
          <li key={hex}>
            <button type="button" onClick={() => copy(hex)} aria-label={`Copy color ${hex}`} className="group/swatch block text-center">
              <span
                className="block size-11 rounded-[10px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-[translate] duration-200 group-hover/swatch:-translate-y-0.5 sm:size-12"
                style={{ backgroundColor: hex }}
              />
              <span className="mt-1 block font-mono text-[0.625rem] text-paper-muted uppercase">{copied === hex ? "copied" : hex.slice(1)}</span>
            </button>
          </li>
        ))}
      </ul>
      <span role="status" className="sr-only">
        {copied && `${copied} copied`}
      </span>
    </>
  );
}
