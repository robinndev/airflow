import { useId } from "react";

/*
 * Objects lying on the auth desk, in pure SVG and theme tokens. The pen is a
 * pen-tablet stylus (most of our artists draw digitally): ink-dark body with
 * a ring in the theme's primary, silver details mixed toward paper. The wax
 * seal is pressed in the theme's primary too.
 */

const SILVER = "color-mix(in oklab, var(--paper) 78%, var(--paper-muted))";
const SILVER_DARK = "color-mix(in oklab, var(--paper-muted) 80%, var(--on-paper))";

/**
 * A pen-tablet stylus lying flat, nib to the right. What makes it read as a
 * tablet pen rather than a ballpoint: a grip cone narrowing to a slim collar
 * with a small nib (the bit that touches the screen), a side rocker switch,
 * and a tail that narrows gently to a rounded eraser end.
 */
export function Stylus({ className = "" }: { className?: string }) {
  const body = `${useId().replace(/[^\w-]/g, "")}-body`;
  return (
    <svg aria-hidden viewBox="0 0 352 34" className={`pointer-events-none ${className}`}>
      <defs>
        {/* A dark cylinder: lit along the top edge, falling into shadow below. */}
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--on-paper) 50%, white)" }} />
          <stop offset=".22" style={{ stopColor: "color-mix(in oklab, var(--on-paper) 72%, black)" }} />
          <stop offset=".6" style={{ stopColor: "color-mix(in oklab, var(--on-paper) 62%, black)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--on-paper) 40%, black)" }} />
        </linearGradient>
      </defs>
      <g style={{ filter: "drop-shadow(0 10px 7px rgb(var(--shadow-rgb) / 0.26))" }}>
        {/* tail, gently narrowing to a rounded eraser end, then the barrel */}
        <path
          d="M4 17C4 12.6 6.5 9.3 11 9.1L150 5.5 300 4.3V29.7L150 28.5 11 24.9C6.5 24.7 4 21.4 4 17Z"
          fill={`url(#${body})`}
        />
        {/* short grip cone, down to a narrow collar */}
        <path d="M303 4.3C317 5.2 331 10.5 340 13.8V20.2C331 23.5 317 28.8 303 29.7Z" fill={`url(#${body})`} />
        {/* the nib: the small tip that touches the screen */}
        <path d="M339.5 15.6 346.8 15.8Q349.6 17 346.8 18.2L339.5 18.4Z" style={{ fill: SILVER_DARK }} />
        {/* silver ring where the cone starts, theme ring at the seam */}
        <rect x="299" y="4.1" width="5" height="25.8" rx="1" style={{ fill: SILVER }} />
        <rect x="300.5" y="4.1" width="1.4" height="25.8" fill="white" fillOpacity=".6" />
        <rect x="145" y="5.5" width="3.5" height="23" rx=".8" className="fill-ocean" />
        <path d="M150.5 5.7V28.3" stroke="black" strokeOpacity=".35" />
        {/* side switch: a rocker with two buttons in a silver bezel */}
        <rect x="206" y="12.2" width="56" height="9.6" rx="4.8" style={{ fill: SILVER }} />
        <rect x="209.5" y="13.6" width="49" height="6.8" rx="3.4" style={{ fill: "color-mix(in oklab, var(--on-paper) 55%, black)" }} />
        <path d="M234 13.8V20.2" stroke="white" strokeOpacity=".35" strokeWidth=".9" />
        {/* specular highlight running along the barrel and down the cone */}
        <path
          d="M14 10.5 140 7.4M156 7 294 5.9M308 6.4C320 7.4 330 10.4 337 13.6"
          stroke="white"
          strokeOpacity=".2"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <text x="34" y="19.2" fontSize="6" fontWeight="800" letterSpacing="1.6" style={{ fill: SILVER }} fillOpacity=".55">
          ARTIFLOW ✦ STUDIO
        </text>
      </g>
    </svg>
  );
}

/** A slightly lumpy circle, like poured wax (deterministic, so SSR and client agree). */
function lumpyCircle(cx: number, cy: number, r: number, points = 26) {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + 0.05 * Math.sin(a * 5 + 1) + 0.03 * Math.cos(a * 9);
    return [cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)];
  });
  const f = (n: number) => n.toFixed(1);
  const mid = (p: number[], q: number[]) => `${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
  let d = `M${mid(pts[points - 1], pts[0])}`;
  pts.forEach((p, i) => {
    d += `Q${f(p[0])} ${f(p[1])} ${mid(p, pts[(i + 1) % points])}`;
  });
  return `${d}Z`;
}

const WAX = lumpyCircle(50, 50, 46);

/** A wax seal pressed with a letter or glyph. Size it with `className`. */
export function WaxSeal({ mark = "✦", className = "" }: { mark?: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={`pointer-events-none ${className}`}>
      <g style={{ filter: "drop-shadow(0 3px 3px rgb(var(--shadow-rgb) / 0.3))" }}>
        <path d={WAX} className="fill-ocean" />
      </g>
      <circle cx="50" cy="50" r="31" fill="none" stroke="black" strokeOpacity=".22" strokeWidth="3" />
      <circle cx="49" cy="49" r="31" fill="none" stroke="white" strokeOpacity=".22" strokeWidth="1.5" />
      <text
        x="51"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={mark.length > 1 ? 24 : 34}
        fontWeight="800"
        fill="black"
        fillOpacity=".24"
        className="font-display"
      >
        {mark}
      </text>
      <text
        x="49.5"
        y="50.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={mark.length > 1 ? 24 : 34}
        fontWeight="800"
        fill="white"
        fillOpacity=".4"
        className="font-display"
      >
        {mark}
      </text>
      <path d="M22 38c4-12 15-20 27-21-9 4-17 11-21 22Z" fill="white" fillOpacity=".25" />
    </svg>
  );
}

/**
 * Construction lines for a figure that's waving hello: line of action, head
 * with face guides, rib cage and pelvis, joints, and a ruler of head-heights.
 * Every stroke draws itself in (`scribble-in`), staggered head to toe.
 */
export function ConstructionSketch({ className = "" }: { className?: string }) {
  const strokes: { d?: string; circle?: [number, number, number]; ellipse?: [number, number, number, number, number]; w?: number; o?: number }[] = [
    // line of action
    { d: "M206 74C224 170 168 250 196 320S206 420 176 470", w: 2.2, o: 0.55 },
    // head, sketched twice
    { circle: [206, 96, 34], w: 1.8 },
    { d: "M175 88C178 66 196 58 214 61S242 80 240 100", w: 1.2, o: 0.5 },
    // face guides
    { d: "M211 62C201 80 199 110 207 130", w: 1.2, o: 0.7 },
    { d: "M173 98C190 104 222 104 239 94", w: 1.2, o: 0.7 },
    // neck + shoulders
    { d: "M204 130 200 150", w: 1.8 },
    { d: "M154 164C180 154 222 150 248 154", w: 1.8 },
    // rib cage + pelvis
    { ellipse: [200, 200, 42, 52, -8], w: 1.8 },
    { ellipse: [197, 292, 38, 25, 7], w: 1.8 },
    { d: "M196 252C192 264 192 272 196 280", w: 1.4, o: 0.7 },
    { d: "M163 296 231 286", w: 1.4, o: 0.7 },
    // waving arm: shoulder → elbow → wrist → hand
    { d: "M248 154 288 116 298 62", w: 1.8 },
    { circle: [288, 116, 6], w: 1.4 },
    { ellipse: [300, 48, 11, 15, 12], w: 1.6 },
    // relaxed arm
    { d: "M154 164 138 232 150 292", w: 1.8 },
    { circle: [138, 232, 6], w: 1.4 },
    { ellipse: [152, 304, 9, 13, -10], w: 1.6 },
    // standing leg
    { d: "M214 296 214 384 194 462", w: 1.8 },
    { circle: [214, 384, 6.5], w: 1.4 },
    { d: "M194 462 224 468", w: 2 },
    // relaxed leg
    { d: "M180 300 160 382 152 452", w: 1.8 },
    { circle: [160, 382, 6.5], w: 1.4 },
    { d: "M152 452 126 460", w: 2 },
    // ground + wave marks
    { d: "M100 474C150 470 230 472 290 476", w: 1.2, o: 0.5 },
    { d: "M322 34C330 42 330 54 322 62", w: 1.4, o: 0.7 },
    { d: "M334 26C346 38 346 58 334 70", w: 1.4, o: 0.5 },
    // head-height ruler
    { d: "M70 62V474", w: 1, o: 0.5 },
    ...Array.from({ length: 7 }, (_, i) => ({ d: `M64 ${62 + i * 68.7}h12`, w: 1, o: 0.5 })),
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 400 500"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`scribble-in pointer-events-none ${className}`}
    >
      {strokes.map((s, i) => {
        const common = {
          pathLength: 1,
          strokeWidth: s.w ?? 1.6,
          strokeOpacity: s.o ?? 0.85,
          style: { animationDelay: `${0.2 + i * 0.07}s`, animationDuration: "0.7s" },
        };
        if (s.circle) return <circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} {...common} />;
        if (s.ellipse) {
          const [cx, cy, rx, ry, rot] = s.ellipse;
          return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} {...common} />;
        }
        return <path key={i} d={s.d} {...common} />;
      })}
      <g fill="currentColor" stroke="none" fontSize="10" fontWeight="600" opacity=".55">
        {Array.from({ length: 6 }, (_, i) => (
          <text key={i} x="50" y={62 + (i + 0.5) * 68.7 + 3}>
            {i + 1}
          </text>
        ))}
      </g>
    </svg>
  );
}
