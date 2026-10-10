/**
 * A round sticker that counts the days on a plan: the plan and its start
 * date run around a slowly turning ring, the day sits on foil in the middle.
 * Decorative; the same facts are written out next to it.
 */
export function PlanSeal({
  id,
  ring,
  day,
  foil,
  className = "",
}: {
  id: string;
  ring: string;
  day: number;
  /** Paid plans get a foil center. */
  foil: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={`pointer-events-none block ${className}`}>
      <span className="relative block aspect-square drop-shadow-[0_8px_16px_rgb(var(--shadow-rgb)/0.22)]">
        <svg viewBox="0 0 120 120" className="absolute inset-0 size-full animate-spin-slow motion-reduce:animate-none">
          <defs>
            <path id={id} d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
          </defs>
          <circle cx="60" cy="60" r="59" className="fill-paper" />
          <circle cx="60" cy="60" r="55" fill="none" strokeDasharray="2 3" className="stroke-on-paper/30" />
          {/* Longer rings get smaller letters, so they never crowd. */}
          <text
            fontSize={Math.min(10.5, 380 / ring.length)}
            className="fill-on-paper font-display font-extrabold tracking-[0.14em] uppercase"
          >
            <textPath href={`#${id}`} textLength="272" lengthAdjust="spacing">
              {ring}
            </textPath>
          </text>
        </svg>
        <span
          className={`absolute inset-[29%] grid place-content-center rounded-full text-center text-on-paper shadow-[inset_0_1px_3px_rgb(0_0_0/0.18)] ${
            foil ? "foil" : "bg-[color-mix(in_oklab,var(--sky)_16%,var(--paper))]"
          }`}
        >
          <span className="text-[0.5rem] leading-none font-extrabold tracking-[0.2em] uppercase opacity-70">Day</span>
          <span
            className={`font-display leading-none font-extrabold tabular-nums ${day < 100 ? "text-[1.625rem]" : "text-[1.125rem]"}`}
          >
            {day}
          </span>
        </span>
      </span>
    </span>
  );
}
