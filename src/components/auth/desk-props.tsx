/*
 * Objects lying on the auth desk. Pure SVG in theme tokens: the pencil is
 * painted in the theme's primary (blue in Aqua, red in Ember), the wax seal
 * too; wood, graphite and eraser are mixed toward paper so they read as
 * materials in both themes.
 */

/** A sharpened pencil, lying flat. Size it by width. */
export function Pencil({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 356 30" className={`pointer-events-none ${className}`}>
      <g style={{ filter: "drop-shadow(0 10px 7px rgb(var(--shadow-rgb) / 0.22))" }}>
        <path d="M286 4 353 15 286 26Z" className="fill-[color-mix(in_oklab,var(--star)_30%,var(--paper))]" />
        <path d="M331 11.3 353 15 331 18.7Z" className="fill-on-paper" />
        <path d="M60 4h228v22H60z" className="fill-ocean" />
        <path d="M60 4h228v7H60z" fill="white" fillOpacity=".26" />
        <path d="M60 19h228v7H60z" fill="black" fillOpacity=".16" />
        <path d="M288 4c6 1.4 6 5.9 0 7.3 6 1.5 6 6 0 7.4 6 1.4 6 5.9 0 7.3Z" className="fill-ocean" />
        <path d="M34 3h28v24H34z" className="fill-[color-mix(in_oklab,var(--paper-muted)_38%,var(--paper))]" />
        <path
          d="M40 3v24M46 3v24M52 3v24"
          strokeWidth="1.2"
          className="stroke-[color-mix(in_oklab,var(--paper-muted)_70%,var(--paper))]"
        />
        <path
          d="M12 4h22v22H12a8 8 0 0 1-8-8v-6a8 8 0 0 1 8-8Z"
          className="fill-[color-mix(in_oklab,var(--like)_40%,var(--paper))]"
        />
        <text x="104" y="18.3" fontSize="7" fontWeight="800" letterSpacing="1.8" fill="white" fillOpacity=".78">
          ARTIFLOW ✦ STUDIO · HB
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
