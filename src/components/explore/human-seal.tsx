import { HandHeart } from "lucide-react";

/**
 * Slowly turning "made by humans" seal, like a sticker slapped on the wall.
 * Position and size it with `className` (it fills the box you give it).
 */
export function HumanSeal({ id, className = "" }: { id: string; className?: string }) {
  return (
    <span role="img" aria-label="Made by humans, drawn by hand" className={`pointer-events-none block ${className}`}>
      <span className="relative block aspect-square drop-shadow-[0_6px_14px_rgb(var(--shadow-rgb)/0.16)]">
        <svg viewBox="0 0 120 120" className="absolute inset-0 size-full animate-spin-slow motion-reduce:animate-none">
          <defs>
            <path id={id} d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
          </defs>
          <circle cx="60" cy="60" r="59" className="fill-paper" />
          <circle cx="60" cy="60" r="55" fill="none" strokeDasharray="2 3" className="stroke-on-paper/30" />
          <text className="fill-on-paper font-display text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
            <textPath href={`#${id}`} textLength="272" lengthAdjust="spacing">
              Made by humans ✦ Drawn by hand ✦
            </textPath>
          </text>
        </svg>
        <span className="absolute inset-[31%] grid place-items-center rounded-full bg-ocean text-white">
          <HandHeart aria-hidden className="size-[55%]" strokeWidth={1.75} />
        </span>
      </span>
    </span>
  );
}
