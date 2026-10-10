"use client";

import { useState } from "react";

/** The artwork's palette as paint chips. Click one to copy its hex — artists will. */
export function PaletteChips({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((current) => (current === hex ? null : current)), 1400);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the hex is still in the tooltip.
    }
  }

  return (
    <>
      <ul className="flex items-end gap-1">
        {colors.slice(0, 5).map((hex) => (
          <li key={hex}>
            <button
              type="button"
              onClick={() => copy(hex)}
              aria-label={`Copy color ${hex}`}
              className="group/chip relative block h-7 w-5 rounded-[5px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-[height,width,translate] duration-200 ease-out hover:-translate-y-0.5 hover:w-7 focus-visible:w-7"
              style={{ backgroundColor: hex }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 rounded-[6px] bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap text-on-ink opacity-0 transition duration-150 group-hover/chip:translate-y-0 group-hover/chip:opacity-100 group-focus-visible/chip:translate-y-0 group-focus-visible/chip:opacity-100">
                {copied === hex ? "Copied!" : hex.toUpperCase()}
              </span>
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
