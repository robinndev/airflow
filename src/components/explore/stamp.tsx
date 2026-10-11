import type { ReactNode } from "react";

const TONES = {
  mint: "text-mint-ink",
  lilac: "text-lilac-ink",
  like: "text-like",
  ocean: "text-ocean-ink",
  paper: "text-on-paper",
  muted: "text-muted",
} as const;

// Uneven ink: a noise mask knocks small specks out of the stamp (postmarks reuse it).
export const INK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='70'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='2' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.25'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E")`;

// On paper (light in both themes), Ember's pale "-ink" tones lose contrast; its base colors read better.
const ON_PAPER: Partial<Record<keyof typeof TONES, string>> = {
  mint: "dark:text-mint",
  lilac: "dark:text-lilac",
  like: "dark:text-like",
  ocean: "dark:text-ocean",
};

/** Rubber-stamp label for statuses ("Comms open", "Adopted"). Set `onPaper` when it's printed on a paper object. */
export function Stamp({
  children,
  tone = "mint",
  onPaper = false,
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  onPaper?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[7px] border-2 border-current px-2 py-[3px] font-display text-[0.6875rem] leading-none font-extrabold tracking-[0.14em] whitespace-nowrap uppercase outline-1 outline-offset-2 outline-current ${TONES[tone]} ${onPaper ? (ON_PAPER[tone] ?? "") : ""} ${className}`}
      style={{ maskImage: INK, WebkitMaskImage: INK }}
    >
      {children}
    </span>
  );
}
