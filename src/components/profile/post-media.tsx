import Image from "next/image";
import type { ImageAsset } from "@/lib/profile/types";

// Never crop a single artwork; very tall pieces are letterboxed at 4:5.
const MIN_SINGLE_RATIO = 4 / 5;

export function PostMedia({ media }: { media: ImageAsset[] }) {
  if (media.length === 1) {
    const [image] = media;
    const ratio = Math.max(image.width / image.height, MIN_SINGLE_RATIO);
    return (
      <div
        className="relative overflow-hidden rounded-[12px] bg-ice"
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1184px) 760px, (min-width: 1024px) 64vw, 100vw"
          className="object-contain"
        />
      </div>
    );
  }

  const tiles = media.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[12px]">
      {tiles.map((image, i) => (
        <div
          key={`${image.src}-${i}`}
          className={`relative bg-ice ${tiles.length === 2 ? "aspect-[4/5]" : "aspect-square"} ${
            tiles.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : ""
          }`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1184px) 380px, (min-width: 1024px) 32vw, 50vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
