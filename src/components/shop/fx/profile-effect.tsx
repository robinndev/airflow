import type { CSSProperties, ReactNode } from "react";

/*
 * Profile effects from the shop: a layer of particles over the top of a
 * profile (banner and name), or over the shop's mirror. Markup + CSS only
 * (`fx-*` in globals.css), so it renders on the server and costs no JS.
 * Positions are seeded, so the server and every visit draw the same scene.
 * It never takes clicks, and it leaves entirely with reduced motion.
 */

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = { x: string; y: string; style: CSSProperties; size: number; tilt: number };

function particles(count: number, seed: number, durations: [number, number]): Particle[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const dur = durations[0] + random() * (durations[1] - durations[0]);
    const x = `${(((i + random() * 0.9) / count) * 100).toFixed(1)}%`;
    const y = `${Math.round(10 + random() * 75)}%`;
    return {
      x,
      y,
      size: 0.7 + random() * 0.6,
      tilt: Math.round(random() * 360),
      style: {
        "--x": x,
        "--y": y,
        "--dur": `${dur.toFixed(1)}s`,
        // Negative delays: the scene is already in motion when the page opens.
        "--delay": `${(-random() * dur).toFixed(1)}s`,
        "--sway": `${(random() * 8 - 4).toFixed(1)}cqw`,
        "--spin": `${Math.round(120 + random() * 300) * (random() > 0.5 ? 1 : -1)}deg`,
        "--blink": `${(1.6 + random() * 1.8).toFixed(1)}s`,
      } as CSSProperties,
    };
  });
}

function Petal({ size, tilt }: Particle) {
  return (
    <svg viewBox="0 0 20 20" width={14 * size} height={14 * size} style={{ rotate: `${tilt}deg` }} aria-hidden>
      <path d="M10 1C4 6 3 13 10 19c7-6 6-13 0-18z" fill="#ffb7cf" />
      <path d="M10 1C4 6 3 13 10 19" fill="none" stroke="#ff8fb5" strokeWidth="1.2" />
    </svg>
  );
}

function Bubble({ size }: Particle) {
  const d = 16 * size;
  return (
    <span
      className="block rounded-full border-[1.5px] border-sky/70 bg-sky/10"
      style={{ width: d, height: d, boxShadow: "inset -2px -3px 0 rgb(255 255 255 / 0.55)" }}
    />
  );
}

function Flake({ size }: Particle) {
  return (
    <svg viewBox="0 0 20 20" width={12 * size} height={12 * size} aria-hidden style={{ filter: "drop-shadow(0 0 1.5px rgb(23 59 91 / 0.45))" }}>
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M10 2v16M3 6l14 8M3 14l14-8" />
      </g>
    </svg>
  );
}

function Firefly({ size }: Particle) {
  const d = 7 * size;
  return (
    <span
      className="fx-blink block rounded-full"
      style={{ width: d, height: d, background: "#f6ff9e", boxShadow: "0 0 6px 2px #d8ff5c, 0 0 14px 4px rgb(216 255 92 / 0.45)" }}
    />
  );
}

function Shooting({ size }: Particle) {
  return (
    <span
      className="block h-[2px] origin-left rounded-full"
      style={{
        width: 70 * size,
        rotate: "-34deg",
        background: "linear-gradient(90deg, #fff, rgb(255 236 160 / 0.9) 20%, transparent)",
        boxShadow: "0 0 6px rgb(255 236 160 / 0.8)",
      }}
    />
  );
}

function Star({ size }: Particle) {
  return (
    <svg viewBox="0 0 24 24" width={10 * size} height={10 * size} aria-hidden className="fx-twinkle">
      <path d="M12 0c.8 7.2 4.8 11.2 12 12-7.2.8-11.2 4.8-12 12-.8-7.2-4.8-11.2-12-12C7.2 11.2 11.2 7.2 12 0Z" fill="#fff6c8" />
    </svg>
  );
}

const SCENES: Record<string, { motion: string; seed: number; durations: [number, number]; draw: (p: Particle) => ReactNode; extra?: (count: number) => ReactNode }> = {
  petals: { motion: "fx-fall", seed: 7, durations: [9, 15], draw: Petal },
  bubbles: { motion: "fx-rise", seed: 11, durations: [7, 12], draw: Bubble },
  snow: { motion: "fx-fall", seed: 23, durations: [11, 18], draw: Flake },
  fireflies: { motion: "fx-wander", seed: 31, durations: [6, 10], draw: Firefly },
  starfall: {
    motion: "fx-shoot",
    seed: 47,
    durations: [6, 11],
    draw: Shooting,
    // A few stars stay put and twinkle between the shooting ones.
    extra: (count) =>
      particles(Math.ceil(count / 2), 53, [2, 4]).map((p, i) => (
        <span key={`s${i}`} className="absolute" style={{ left: p.x, top: p.y, ...p.style }}>
          <Star {...p} />
        </span>
      )),
  },
};

export const PROFILE_EFFECTS = Object.keys(SCENES);

/** The effect's layer. Put it inside a `relative` box; `count` sets how busy it is. */
export function ProfileEffect({ id, count = 16, className = "" }: { id: string | null | undefined; count?: number; className?: string }) {
  const scene = id ? SCENES[id] : undefined;
  if (!scene) return null;
  // Shooting stars start high on the right and cross down to the left.
  const list = particles(scene.motion === "fx-shoot" ? Math.ceil(count / 3) : count, scene.seed, scene.durations);
  return (
    <div aria-hidden data-part="profile-effect" className={`fx-layer fx-motion pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}>
      {scene.extra?.(count)}
      {list.map((p, i) => (
        <span
          key={i}
          className={`fx-p ${scene.motion}`}
          style={{
            ...p.style,
            ...(scene.motion === "fx-fall" || scene.motion === "fx-rise" ? { "--y": "0%" } : {}),
            ...(scene.motion === "fx-shoot" ? { "--x": `${55 + (i * 37) % 45}%`, "--y": `${(i * 23) % 40}%` } : {}),
          } as CSSProperties}
        >
          {scene.draw(p)}
        </span>
      ))}
    </div>
  );
}
