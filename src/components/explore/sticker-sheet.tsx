import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Category, StickerShape } from "@/lib/explore";
import { formatCompact } from "@/lib/format";
import { HandNote } from "./doodles";

/* Die-cut outlines in a 100 × 100 box. */

function scallop(bumps: number, radius: number) {
  const point = (i: number) => {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    return `${(50 + radius * Math.cos(a)).toFixed(2)} ${(50 + radius * Math.sin(a)).toFixed(2)}`;
  };
  const bump = (radius * Math.sin(Math.PI / bumps)).toFixed(2);
  let d = `M${point(0)}`;
  for (let i = 1; i <= bumps; i++) d += `A${bump} ${bump} 0 0 1 ${point(i)}`;
  return `${d}Z`;
}

function burst(points: number, outer: number, inner: number) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    d += `${i === 0 ? "M" : "L"}${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

const SHAPES: Record<StickerShape, string> = {
  circle: "M50 0a50 50 0 1 1 0 100a50 50 0 1 1 0-100Z",
  squircle: "M50 0C90 0 100 10 100 50s-10 50-50 50S0 90 0 50 10 0 50 0Z",
  arch: "M3 100V50C3 24 24 3 50 3s47 21 47 47v50Z",
  scallop: scallop(14, 40.5),
  burst: burst(16, 50, 42),
  blob: "M54 3c22 1 42 16 43 42s-13 50-42 52S4 82 3 54 24 2 54 3Z",
  cloud: "M24 86C10 86 1 75 2 62c1-12 11-20 22-19 0-16 13-28 29-27 13 1 22 9 25 21 13-1 22 9 21 23-1 14-11 26-24 26Z",
};

const MASKS = Object.fromEntries(
  Object.entries(SHAPES).map(([shape, d]) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}"/></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return [
      shape,
      { maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" },
    ];
  }),
) as Record<StickerShape, CSSProperties>;

const TILTS = [-6, 4, -3, 7, -5, 3, 5, -7, 2, -4, 6, -2];


function StickerLink({
  href,
  shape,
  index,
  label,
  meta,
  children,
}: {
  href: string;
  shape: StickerShape;
  index: number;
  label: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <li className="flex justify-center">
      <Link href={href} className="group flex w-full flex-col items-center gap-3 rounded-[16px] text-center">
        <span
          className="relative block w-full max-w-[8.5rem] drop-shadow-[0_3px_3px_rgb(var(--shadow-rgb)/0.16)] transition-[translate,scale,rotate,filter] duration-300 ease-out rotate-(--tilt) group-hover:-translate-y-1.5 group-hover:scale-[1.06] group-hover:drop-shadow-[0_16px_18px_rgb(var(--shadow-rgb)/0.22)] group-hover:rotate-[calc(var(--tilt)*-0.6)]"
          style={{ "--tilt": `${TILTS[index % TILTS.length]}deg` } as CSSProperties}
        >
          <span className="block aspect-square bg-paper p-[7%]" style={MASKS[shape]}>
            <span className="relative block size-full overflow-hidden" style={MASKS[shape]}>
              {children}
            </span>
          </span>
        </span>
        <span>
          <span className="block text-[0.9375rem] leading-tight font-semibold text-ink">{label}</span>
          <span className="mt-0.5 block text-xs text-muted">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

/** Categories as die-cut stickers on a dot-grid sheet. */
export function StickerSheet({ categories }: { categories: Category[] }) {
  return (
    <div
      className="grain -mx-4 border-y border-border bg-surface py-8 sm:mx-0 sm:rounded-[28px] sm:border sm:px-8 sm:py-10"
      style={{
        backgroundImage: "radial-gradient(circle, var(--border) 1.2px, transparent 1.4px)",
        backgroundSize: "22px 22px",
        backgroundPosition: "11px 11px",
      }}
    >
      <ul className="grid auto-cols-[34%] grid-flow-col grid-rows-2 gap-x-2 gap-y-7 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:grid-flow-row sm:grid-cols-4 sm:grid-rows-none sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {categories.map((category, i) => (
          <StickerLink
            key={category.slug}
            href={category.href}
            shape={category.shape}
            index={i}
            label={category.label}
            meta={`${formatCompact(category.count)} artists`}
          >
            <Image
              src={category.cover.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 136px, (min-width: 640px) 20vw, 30vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              style={{ objectPosition: category.cover.focus ?? "50% 25%" }}
            />
            <span className="absolute inset-0 bg-gradient-to-br from-paper/30 via-transparent to-transparent" />
          </StickerLink>
        ))}
        <StickerLink
          href="/explore/search"
          shape="circle"
          index={categories.length}
          label="Everything else"
          meta="Tattoos, VTubers, D&D…"
        >
          <span className="grid size-full place-items-center rounded-full border-2 border-dashed border-on-paper/25 bg-paper">
            <HandNote tone="accent" className="rotate-[-8deg] text-[1.75rem]">
              & more!
            </HandNote>
          </span>
        </StickerLink>
      </ul>
    </div>
  );
}
