import type { CSSProperties } from "react";

/*
 * Animated covers from the shop: a layer over the cover image (the art stays
 * underneath, untouched). CSS only (`cover-*` in globals.css); still with
 * reduced motion.
 */

// Two sheets of short rain streaks, tiled and slid down (cover-rain).
const streaks = (size: number, lines: [number, number, number][]) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><g stroke='white' stroke-linecap='round'>${lines
      .map(([x, y, l]) => `<path d='M${x} ${y}l-${(l * 0.22).toFixed(1)} ${l}' stroke-opacity='.55' stroke-width='1.2'/>`)
      .join("")}</g></svg>`,
  )}")`;

const RAIN = {
  "--rain-a": streaks(140, [[12, 8, 18], [58, 40, 22], [104, 14, 16], [30, 86, 20], [86, 98, 18], [128, 66, 14]]),
  "--rain-b": streaks(90, [[20, 20, 12], [62, 52, 14], [40, 74, 10], [80, 6, 12]]),
} as CSSProperties;

const STARS: [number, number, number][] = [
  [8, 22, 1], [17, 64, 0.7], [26, 14, 0.8], [35, 46, 1.1], [44, 26, 0.6], [52, 70, 0.9], [61, 12, 1], [69, 40, 0.7],
  [77, 66, 1.2], [85, 20, 0.8], [92, 48, 0.9], [13, 40, 0.6], [57, 50, 0.6], [97, 10, 0.7],
];

export function CoverEffect({ id, className = "" }: { id: string | null | undefined; className?: string }) {
  if (!id) return null;
  const layer = `pointer-events-none absolute inset-0 ${className}`;
  switch (id) {
    case "rain":
      return (
        <div aria-hidden data-part="cover-effect" className={layer}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(30_60_110/0.22),rgb(30_60_110/0.08))]" />
          <div className="cover-rain absolute inset-0" style={RAIN} />
        </div>
      );
    case "sunbeams":
      return <div aria-hidden data-part="cover-effect" className={`${layer} cover-sunbeams`} />;
    case "twinkle":
      return (
        <div aria-hidden data-part="cover-effect" className={layer}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(12_14_40/0.35),transparent_70%)]" />
          {STARS.map(([x, y, s], i) => (
            <svg
              key={i}
              viewBox="0 0 24 24"
              className="fx-twinkle absolute"
              style={{ left: `${x}%`, top: `${y}%`, width: 12 * s, height: 12 * s, "--dur": `${2 + (i % 4) * 0.7}s`, "--delay": `${-(i * 0.37).toFixed(2)}s` } as CSSProperties}
            >
              <path d="M12 0c.8 7.2 4.8 11.2 12 12-7.2.8-11.2 4.8-12 12-.8-7.2-4.8-11.2-12-12C7.2 11.2 11.2 7.2 12 0Z" fill="#fff8d6" />
            </svg>
          ))}
        </div>
      );
    case "holo":
      return <div aria-hidden data-part="cover-effect" className={`${layer} cover-holo`} />;
    default:
      return null;
  }
}
