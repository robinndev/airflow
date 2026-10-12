/* A prize rosette, the kind pinned next to a piece at a county fair art show. */

function petals(count: number, outer: number, inner: number) {
  let d = "";
  for (let i = 0; i <= count * 2; i++) {
    const a = (i / (count * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const [x, y] = [50 + r * Math.cos(a), 46 + r * Math.sin(a)];
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `Q${(50 + (r + 2) * Math.cos(a - Math.PI / (count * 2))).toFixed(2)} ${(46 + (r + 2) * Math.sin(a - Math.PI / (count * 2))).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

const RING = petals(18, 34, 29);
const TONES = ["text-ocean", "text-lilac", "text-mint-strong"] as const;
const PLACES = ["1st", "2nd", "3rd"] as const;

export function Rosette({ place, className = "" }: { place: 1 | 2 | 3; className?: string }) {
  return (
    <svg viewBox="0 0 100 118" role="img" aria-label={`${PLACES[place - 1]} place`} className={`${TONES[place - 1]} drop-shadow-[0_6px_10px_rgb(var(--shadow-rgb)/0.25)] ${className}`}>
      <path d="M38 62 26 114l12-9 9 11 6-50Z" fill="currentColor" opacity=".85" />
      <path d="M62 62l12 52-12-9-9 11-6-50Z" fill="currentColor" opacity=".7" />
      <path d={RING} fill="currentColor" />
      <circle cx="50" cy="46" r="24" fill="var(--paper)" />
      <circle cx="50" cy="46" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2.5" />
      <text x="50" y="52" textAnchor="middle" className="fill-on-paper font-display text-[17px] font-extrabold">
        {PLACES[place - 1]}
      </text>
    </svg>
  );
}
