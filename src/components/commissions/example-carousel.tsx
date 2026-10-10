"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { ImageAsset } from "@/lib/profile/types";
import { openService } from "./events";

/**
 * Native scroll-snap carousel: swipe works on touch with zero JS; the arrows
 * and dots are a thin layer on top. Slides past the first stay lazy-loaded.
 */
export function ExampleCarousel({
  images,
  title,
  serviceId,
  href,
}: {
  images: ImageAsset[];
  title: string;
  /** When set, clicking a slide opens that service's detail modal. */
  serviceId?: string;
  /** When set, clicking a slide navigates here (used outside the commissions page). */
  href?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: clamped * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  const arrow =
    "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur-sm transition-opacity hover:bg-surface disabled:opacity-0 sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100 [&_svg]:size-4";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} examples`}
      className="group/carousel relative h-full"
    >
      <div
        ref={trackRef}
        onScroll={(e) =>
          setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${images.length}`}
            className="relative h-full w-full shrink-0 snap-center"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 320px, 100vw"
              className="object-cover"
              style={{ objectPosition: image.focus ?? "50% 25%" }}
            />
            {href && (
              // Mouse/touch shortcut only; the card title link covers keyboard users.
              <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0" />
            )}
            {serviceId && (
              // Mouse/touch shortcut only; the title and Request button cover keyboard users.
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => openService(serviceId)}
                className="absolute inset-0 cursor-zoom-in"
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous example"
            disabled={index === 0}
            onClick={() => go(index - 1)}
            className={`${arrow} left-3`}
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next example"
            disabled={index === images.length - 1}
            onClick={() => go(index + 1)}
            className={`${arrow} right-3`}
          >
            <ChevronRight aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((image, i) => (
              <button
                key={`${image.src}-dot-${i}`}
                type="button"
                aria-label={`Show example ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full shadow-sm transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
