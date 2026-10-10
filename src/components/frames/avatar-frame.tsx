import { useId, type CSSProperties, type ReactNode } from "react";
import type { FrameId } from "@/lib/frames";

/*
 * Avatar frames, drawn in SVG around the picture. The drawing box is 144
 * units wide with the avatar as the 100-unit circle in the middle, so a frame
 * reaches 22% past the avatar on every side (like a decoration, it overlaps
 * whatever is around). Pure markup + CSS animations (`frame-*` in
 * globals.css), so it renders on the server and costs no JS.
 */

const C = 72; // center

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: +(C + r * Math.sin(a)).toFixed(2), y: +(C - r * Math.cos(a)).toFixed(2) };
};

type DrawProps = { uid: string };

/** Wraps an avatar; `frame` undefined renders the avatar alone. */
export function FramedAvatar({
  frame,
  children,
  className = "",
}: {
  frame?: FrameId | string | null;
  children: ReactNode;
  className?: string;
}) {
  const Draw = frame ? DRAWINGS[frame as FrameId] : undefined;
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
      {children}
      {Draw && <FrameSvg Draw={Draw} />}
    </span>
  );
}

/** Just the decoration, around an avatar-sized parent (shop and picker tiles). Give the parent `relative` and a size. */
export function FrameArt({ frame, className = "" }: { frame: FrameId; className?: string }) {
  const Draw = DRAWINGS[frame];
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <FrameSvg Draw={Draw} />
    </span>
  );
}

function FrameSvg({ Draw }: { Draw: (p: DrawProps) => ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      aria-hidden
      viewBox="0 0 144 144"
      className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-[144%] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-visible"
    >
      <Draw uid={uid} />
    </svg>
  );
}

/* ------------------------------------------------------------------ frames */

function Flower({ x, y, s = 1, r = 0, fill }: { x: number; y: number; s?: number; r?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-5.2" rx="3.6" ry="5.6" fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r="2.2" fill="#ffd166" />
      <circle r="1" fill="#ff9f1c" />
    </g>
  );
}

function Sakura({ uid }: DrawProps) {
  const fill = `url(#${uid}p)`;
  const flowers = [
    { a: -62, r: 54, s: 1.15 },
    { a: -40, r: 57, s: 0.85 },
    { a: -18, r: 55, s: 0.7 },
    { a: 118, r: 55, s: 1.05 },
    { a: 140, r: 57, s: 0.75 },
    { a: 205, r: 54, s: 0.6 },
  ];
  const petals = [
    { x: 30, y: 8, d: "0s" },
    { x: 112, y: 4, d: "-2.2s" },
    { x: 128, y: 40, d: "-4.1s" },
    { x: 14, y: 60, d: "-1.3s" },
  ];
  return (
    <>
      <defs>
        <radialGradient id={`${uid}p`} cx="50%" cy="80%" r="80%">
          <stop offset="0" stopColor="#fff0f5" />
          <stop offset="0.55" stopColor="#ffb3cc" />
          <stop offset="1" stopColor="#f0679a" />
        </radialGradient>
      </defs>
      {/* a thin branch hugging the circle */}
      <path
        d={`M ${polar(53, -80).x} ${polar(53, -80).y} A 53 53 0 0 1 ${polar(53, -5).x} ${polar(53, -5).y}`}
        fill="none"
        stroke="#7a4b3a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d={`M ${polar(53, 105).x} ${polar(53, 105).y} A 53 53 0 0 1 ${polar(53, 160).x} ${polar(53, 160).y}`}
        fill="none"
        stroke="#7a4b3a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {flowers.map((f, i) => {
        const p = polar(f.r, f.a);
        return <Flower key={i} x={p.x} y={p.y} s={f.s} r={f.a * 1.7} fill={fill} />;
      })}
      {petals.map((p, i) => (
        <ellipse
          key={i}
          cx={p.x}
          cy={p.y}
          rx="2.4"
          ry="3.6"
          fill="#ffb3cc"
          className="frame-drift"
          style={{ animationDelay: p.d } as CSSProperties}
        />
      ))}
    </>
  );
}

function wobblyCircle(r: number, seed: number, close = 1.04) {
  const pts: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps * close; i++) {
    const deg = (i / steps) * 360 + seed * 20;
    const wobble = Math.sin(i * 0.9 + seed) * 1.4 + Math.sin(i * 2.3 + seed * 2) * 0.7;
    const p = polar(r + wobble, deg);
    pts.push(`${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
  }
  return pts.join(" ");
}

const STAR = "M0 -6 L1.6 -1.9 L5.9 -1.9 L2.5 0.8 L3.7 5 L0 2.5 L-3.7 5 L-2.5 0.8 L-5.9 -1.9 L-1.6 -1.9 Z";
const HEART = "M0 4 C -6 -1, -4 -6, 0 -3 C 4 -6, 6 -1, 0 4 Z";
const SPARK = "M0 -6 Q 0.8 -0.8 6 0 Q 0.8 0.8 0 6 Q -0.8 0.8 -6 0 Q -0.8 -0.8 0 -6 Z";

function Doodle() {
  return (
    <g className="text-ink" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d={wobblyCircle(54, 1)} strokeWidth="1.8" />
      <path d={wobblyCircle(56.5, 4, 0.7)} strokeWidth="1" opacity="0.55" />
      <path d={STAR} transform="translate(118 26) rotate(12) scale(1.5)" fill="#ffd166" strokeWidth="1.1" />
      <path d={HEART} transform="translate(24 116) rotate(-14) scale(1.7)" fill="#ff6f91" strokeWidth="1.1" />
      <path d={SPARK} transform="translate(20 34) scale(0.9)" fill="#6ec5ff" strokeWidth="1" />
      {/* motion lines */}
      <path d="M126 104 l7 3 M124 111 l6 5" strokeWidth="1.4" />
      <path d="M44 6 q4 -3 8 0 t8 0" strokeWidth="1.3" />
    </g>
  );
}

function Pixel() {
  const cells: { x: number; y: number; c: string }[] = [];
  const size = 4;
  const colors = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#9d7bff"];
  for (let gx = 0; gx < 144; gx += size) {
    for (let gy = 0; gy < 144; gy += size) {
      const dx = gx + size / 2 - C;
      const dy = gy + size / 2 - C;
      const d = Math.hypot(dx, dy);
      if (d >= 51 && d <= 58) {
        const band = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 10) % colors.length;
        cells.push({ x: gx, y: gy, c: d > 55.5 ? "#1b1b2f" : colors[band] });
      }
    }
  }
  return (
    <g shapeRendering="crispEdges">
      {cells.map((cell, i) => (
        <rect key={i} x={cell.x} y={cell.y} width={size} height={size} fill={cell.c} />
      ))}
      {/* a pixel heart pickup */}
      <g transform="translate(112 106)" fill="#ff4d6d">
        {[
          [1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
          [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 3], [3, 3], [4, 3], [3, 4],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x * 3} y={y * 3} width="3" height="3" />
        ))}
      </g>
    </g>
  );
}

function Kitty({ uid }: DrawProps) {
  const ear = (deg: number, flip: number) => {
    const p = polar(46, deg);
    return (
      <g transform={`translate(${p.x} ${p.y}) rotate(${deg}) scale(${flip} 1)`}>
        <path d="M -15 8 Q -12 -10 2 -24 Q 12 -6 15 8 Z" fill={`url(#${uid}f)`} stroke="#3b3355" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M -8 5 Q -6 -6 2 -15 Q 8 -4 9 5 Z" fill="#ff9fbf" />
      </g>
    );
  };
  return (
    <>
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b5280" />
          <stop offset="1" stopColor="#3b3355" />
        </linearGradient>
      </defs>
      {ear(-36, 1)}
      {ear(36, -1)}
      {/* bow */}
      <g transform={`translate(${polar(54, 132).x} ${polar(54, 132).y}) rotate(-18)`}>
        <path d="M0 0 L-13 -8 Q-16 0 -13 8 Z" fill="#ff5c8a" stroke="#c2185b" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M0 0 L13 -8 Q16 0 13 8 Z" fill="#ff5c8a" stroke="#c2185b" strokeWidth="1.2" strokeLinejoin="round" />
        <circle r="3.6" fill="#ff85a7" stroke="#c2185b" strokeWidth="1.2" />
      </g>
    </>
  );
}

function Neon({ uid }: DrawProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}n`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00f0ff" />
          <stop offset="0.5" stopColor="#ff2bd6" />
          <stop offset="1" stopColor="#7c4dff" />
        </linearGradient>
        <filter id={`${uid}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="frame-spin" style={{ "--frame-dur": "7s" } as CSSProperties} filter={`url(#${uid}g)`}>
        <circle cx={C} cy={C} r="54" fill="none" stroke={`url(#${uid}n)`} strokeWidth="3.4" />
        <circle cx={C} cy={C} r="59" fill="none" stroke={`url(#${uid}n)`} strokeWidth="1" strokeDasharray="10 14" opacity="0.8" />
      </g>
      <g className="frame-pulse">
        {[20, 140, 250].map((a) => {
          const p = polar(54, a);
          return <circle key={a} cx={p.x} cy={p.y} r="2.4" fill="#fff" filter={`url(#${uid}g)`} />;
        })}
      </g>
    </>
  );
}

function Flame({ uid }: DrawProps) {
  const tongues = Array.from({ length: 22 }, (_, i) => {
    const a = 100 + (i / 21) * 160 + (i % 2 ? 4 : -2); // the lower arc, licking upward
    const size = 0.55 + ((i * 7) % 5) / 9;
    return { a: a - 180 + 180, size, delay: `${-((i * 0.37) % 1.4).toFixed(2)}s` };
  });
  const sides = Array.from({ length: 10 }, (_, i) => ({
    a: i < 5 ? -95 + i * 14 : 95 - (i - 5) * 14,
    size: 0.45 + ((i * 3) % 4) / 10,
    delay: `${-((i * 0.53) % 1.2).toFixed(2)}s`,
  }));
  return (
    <>
      <defs>
        <linearGradient id={`${uid}t`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff3948" />
          <stop offset="0.5" stopColor="#ff762e" />
          <stop offset="1" stopColor="#ffd166" />
        </linearGradient>
        <filter id={`${uid}h`}>
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <circle cx={C} cy={C} r="52" fill="none" stroke="#ff762e" strokeWidth="5" opacity="0.55" filter={`url(#${uid}h)`} />
      {[...tongues, ...sides].map((t, i) => {
        const base = polar(50, t.a);
        // Flames rise: tilt toward "up" from wherever they sit on the ring.
        const tilt = t.a > 90 && t.a < 270 ? 180 - (180 - t.a) * 0.35 + 180 : t.a * 0.6;
        return (
          <g key={i} transform={`translate(${base.x} ${base.y}) rotate(${tilt}) scale(${t.size})`}>
            <path
              d="M 0 0 C -7 -6, -6 -15, 0 -26 C 6 -15, 7 -6, 0 0 Z"
              fill={`url(#${uid}t)`}
              className="frame-flicker"
              style={{ animationDelay: t.delay } as CSSProperties}
            />
          </g>
        );
      })}
    </>
  );
}

function Holo({ uid }: DrawProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9de2" />
          <stop offset="0.2" stopColor="#ffd59e" />
          <stop offset="0.4" stopColor="#b5ffcf" />
          <stop offset="0.6" stopColor="#9ee6ff" />
          <stop offset="0.8" stopColor="#c7a6ff" />
          <stop offset="1" stopColor="#ff9de2" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="frame-spin" style={{ "--frame-dur": "9s" } as CSSProperties}>
        <circle cx={C} cy={C} r="55" fill="none" stroke={`url(#${uid}r)`} strokeWidth="7" />
      </g>
      <g className="frame-spin" style={{ "--frame-dur": "3.2s" } as CSSProperties}>
        <path
          d={`M ${polar(55, -40).x} ${polar(55, -40).y} A 55 55 0 0 1 ${polar(55, 20).x} ${polar(55, 20).y}`}
          fill="none"
          stroke={`url(#${uid}s)`}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <circle cx={C} cy={C} r="58.6" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
      <circle cx={C} cy={C} r="51.4" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
      {[
        { a: 40, s: 1.4, d: "0s" },
        { a: 200, s: 1, d: "-0.8s" },
        { a: 300, s: 0.8, d: "-1.6s" },
      ].map((sp, i) => {
        const p = polar(63, sp.a);
        return (
          <path
            key={i}
            d={SPARK}
            fill="#fff"
            transform={`translate(${p.x} ${p.y}) scale(${sp.s})`}
            className="frame-twinkle"
            style={{ animationDelay: sp.d } as CSSProperties}
          />
        );
      })}
    </>
  );
}

function Crown({ uid }: DrawProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}k`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#c98a00" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r="53" fill="none" stroke={`url(#${uid}k)`} strokeWidth="3" />
      <circle cx={C} cy={C} r="56.5" fill="none" stroke="#c98a00" strokeWidth="0.8" strokeDasharray="1.5 3" />
      <g transform="translate(100 18) rotate(24)">
        <path
          d="M -22 10 L -26 -12 L -12 -2 L 0 -18 L 12 -2 L 26 -12 L 22 10 Z"
          fill={`url(#${uid}k)`}
          stroke="#8a5a00"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <rect x="-22" y="7" width="44" height="7" rx="2" fill="#ffc93c" stroke="#8a5a00" strokeWidth="1.4" />
        <circle cx="-26" cy="-12" r="3" fill="#ff4d6d" stroke="#8a5a00" strokeWidth="1" />
        <circle cx="0" cy="-18" r="3.4" fill="#4cc9f0" stroke="#8a5a00" strokeWidth="1" />
        <circle cx="26" cy="-12" r="3" fill="#06d6a0" stroke="#8a5a00" strokeWidth="1" />
        <circle cx="0" cy="10.5" r="2.2" fill="#ff4d6d" />
        <circle cx="-12" cy="10.5" r="1.6" fill="#fff" opacity="0.9" />
        <circle cx="12" cy="10.5" r="1.6" fill="#fff" opacity="0.9" />
      </g>
      <path d={SPARK} fill="#fff6cc" transform="translate(130 46) scale(0.8)" className="frame-twinkle" />
    </>
  );
}

function Stardust() {
  return (
    <>
      <circle cx={C} cy={C} r="56" fill="none" stroke="#b9a7ff" strokeWidth="1.2" strokeDasharray="0.5 5" strokeLinecap="round" />
      <circle cx={C} cy={C} r="61" fill="none" stroke="#b9a7ff" strokeWidth="0.6" strokeOpacity="0.5" />
      <g className="frame-spin" style={{ "--frame-dur": "14s" } as CSSProperties}>
        {[
          { a: 0, r: 56, s: 1.6, c: "#ffd166" },
          { a: 130, r: 61, s: 1.1, c: "#ff9de2" },
          { a: 245, r: 56, s: 1.25, c: "#9ee6ff" },
        ].map((st, i) => {
          const p = polar(st.r, st.a);
          return <path key={i} d={STAR} fill={st.c} transform={`translate(${p.x} ${p.y}) scale(${st.s})`} />;
        })}
      </g>
      {[60, 190, 310].map((a, i) => {
        const p = polar(66, a);
        return (
          <circle
            key={a}
            cx={p.x}
            cy={p.y}
            r="1.4"
            fill="#fff"
            className="frame-twinkle"
            style={{ animationDelay: `${-i * 0.7}s` } as CSSProperties}
          />
        );
      })}
    </>
  );
}

function Paint() {
  const arcs = [
    { from: -100, to: -20, c: "#ff6b6b", w: 7 },
    { from: -15, to: 60, c: "#ffd43b", w: 6 },
    { from: 65, to: 150, c: "#4dabf7", w: 7.5 },
    { from: 155, to: 255, c: "#9775fa", w: 6.5 },
  ];
  const drips = [
    { a: 168, len: 14, c: "#9775fa", d: "0s" },
    { a: 186, len: 22, c: "#9775fa", d: "-1.1s" },
    { a: 205, len: 11, c: "#9775fa", d: "-0.5s" },
    { a: 140, len: 16, c: "#4dabf7", d: "-1.6s" },
  ];
  return (
    <g strokeLinecap="round" fill="none">
      {arcs.map((arc, i) => {
        const a = polar(54, arc.from);
        const b = polar(54, arc.to);
        return (
          <path key={i} d={`M ${a.x} ${a.y} A 54 54 0 0 1 ${b.x} ${b.y}`} stroke={arc.c} strokeWidth={arc.w} />
        );
      })}
      {drips.map((d, i) => {
        const p = polar(55, d.a);
        return (
          <g key={i} className="frame-drip" style={{ animationDelay: d.d } as CSSProperties}>
            <path d={`M ${p.x} ${p.y} l 0 ${d.len}`} stroke={d.c} strokeWidth="4.4" />
            <circle cx={p.x} cy={p.y + d.len + 1.5} r="3.4" fill={d.c} stroke="none" />
          </g>
        );
      })}
      <circle cx="122" cy="22" r="5" fill="#ff6b6b" stroke="none" />
      <circle cx="131" cy="31" r="2.4" fill="#ff6b6b" stroke="none" />
      <circle cx="16" cy="44" r="3.4" fill="#ffd43b" stroke="none" />
    </g>
  );
}

const DRAWINGS: Record<FrameId, (p: DrawProps) => ReactNode> = {
  sakura: Sakura,
  doodle: Doodle,
  pixel: Pixel,
  kitty: Kitty,
  neon: Neon,
  flame: Flame,
  holo: Holo,
  crown: Crown,
  stardust: Stardust,
  paint: Paint,
};
