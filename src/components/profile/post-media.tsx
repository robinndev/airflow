"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/lib/profile/types";

// Single images are cropped into this range (no empty side bars); the
// lightbox always shows the full, uncropped artwork.
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 16 / 9;

export function PostMedia({ media }: { media: ImageAsset[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const tiles = media.slice(0, 4);

  function open(i: number) {
    setIndex(i);
    dialogRef.current?.showModal();
  }

  return (
    <>
      {tiles.length === 1 ? (
        <Tile
          image={tiles[0]}
          onOpen={() => open(0)}
          style={{
            aspectRatio: Math.min(MAX_RATIO, Math.max(MIN_RATIO, tiles[0].width / tiles[0].height)),
          }}
          sizes="(min-width: 1024px) 560px, 100vw"
        />
      ) : (
        <div
          className={`grid gap-0.5 ${
            tiles.length === 2 ? "aspect-[16/10] grid-cols-2" : "aspect-[16/11] grid-cols-2 grid-rows-2"
          }`}
        >
          {tiles.map((image, i) => (
            <Tile
              key={`${image.src}-${i}`}
              image={image}
              onOpen={() => open(i)}
              className={tiles.length === 3 && i === 0 ? "row-span-2" : ""}
              sizes="(min-width: 1024px) 280px, 50vw"
            />
          ))}
        </div>
      )}

      <Lightbox dialogRef={dialogRef} media={media} index={index} setIndex={setIndex} />
    </>
  );
}

function Tile({
  image,
  onOpen,
  className = "",
  style,
  sizes,
}: {
  image: ImageAsset;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
  sizes: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View image: ${image.alt}`}
      className={`group/tile relative block w-full cursor-zoom-in overflow-hidden bg-ice ${className}`}
      style={style}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover/tile:scale-[1.02]"
        style={{ objectPosition: image.focus ?? "50% 30%" }}
      />
    </button>
  );
}

function Lightbox({
  dialogRef,
  media,
  index,
  setIndex,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  media: ImageAsset[];
  index: number | null;
  setIndex: (i: number | null) => void;
}) {
  const current = index === null ? null : media[index];
  const many = media.length > 1;

  useEffect(() => {
    if (index === null || !many) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setIndex(((index ?? 0) + 1) % media.length);
      if (event.key === "ArrowLeft") setIndex(((index ?? 0) - 1 + media.length) % media.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, many, media.length, setIndex]);

  const nav =
    "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 [&_svg]:size-6";

  return (
    <dialog
      ref={dialogRef}
      aria-label="Image viewer"
      onClose={() => setIndex(null)}
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-scrim/92 p-0 outline-none backdrop:bg-transparent open:grid open:place-items-center"
    >
      {current && (
        <>
          <div className="pointer-events-none relative h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] sm:w-[calc(100vw-10rem)]">
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              fill
              loading="eager"
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close image viewer"
            className="absolute top-4 left-4 grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <X aria-hidden className="size-5" />
          </button>
          {many && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setIndex(((index ?? 0) - 1 + media.length) % media.length)}
                className={`${nav} left-4`}
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setIndex(((index ?? 0) + 1) % media.length)}
                className={`${nav} right-4`}
              >
                <ChevronRight aria-hidden />
              </button>
              <p className="absolute bottom-5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
                {(index ?? 0) + 1} / {media.length}
              </p>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
