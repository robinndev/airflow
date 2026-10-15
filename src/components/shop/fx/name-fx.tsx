import type { CSSProperties } from "react";
import { Sparkle } from "@/components/explore/doodles";

/*
 * Animated names from the shop, wrapped around the display name inside its
 * heading (so the artist's font, color and size still apply). CSS only
 * (`name-fx-*` in globals.css); still with reduced motion. The name stays
 * one readable string for screen readers.
 */

export const NAME_FX = ["wave", "rainbow", "neon", "glitch", "sparkle"] as const;

export function NameFx({ fx, text }: { fx: string | null | undefined; text: string }) {
  switch (fx) {
    case "wave":
      return (
        <span className="name-fx-wave">
          <span className="sr-only">{text}</span>
          <span aria-hidden>
            {Array.from(text).map((char, i) => (
              <span key={i} className="fx-letter" style={{ "--i": i } as CSSProperties}>
                {char}
              </span>
            ))}
          </span>
        </span>
      );
    case "rainbow":
    case "neon":
      return <span className={`name-fx-${fx}`}>{text}</span>;
    case "glitch":
      return (
        <span className="name-fx-glitch" data-text={text}>
          {text}
        </span>
      );
    case "sparkle":
      return (
        <span className="relative inline-block">
          {text}
          <span aria-hidden className="pointer-events-none absolute inset-0">
            <Sparkle className="fx-twinkle absolute -top-[0.3em] -left-[0.35em] size-[0.45em] text-star [--dur:2.4s]" />
            <Sparkle className="fx-twinkle absolute top-[0.1em] -right-[0.45em] size-[0.35em] text-lilac [--delay:-0.8s] [--dur:2.8s]" />
            <Sparkle className="fx-twinkle absolute -bottom-[0.2em] left-[45%] size-[0.3em] text-mint [--delay:-1.6s] [--dur:2.2s]" />
          </span>
        </span>
      );
    default:
      return <>{text}</>;
  }
}
