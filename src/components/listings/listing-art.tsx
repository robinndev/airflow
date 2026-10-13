import Image from "next/image";
import type { ImageAsset } from "@/lib/profile/types";

/**
 * A listing's picture (commission example, adoptable) in its box: whole,
 * never cropped, never enlarged past its real size, and see-through parts
 * showing the box behind it. Fills the nearest positioned parent, centered.
 * Served as uploaded (its thumb when that's wide enough; see loader.ts), so
 * chibis, pixel art and GIFs come out exactly as the artist made them.
 */
export function ListingArt({
  image,
  alt = image.alt ?? "",
  sizes,
  priority = false,
  className = "",
}: {
  image: Pick<ImageAsset, "src" | "width" | "height"> & { alt?: string };
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // Capped at the image's own pixels; inset-0 + m-auto centers it once the cap applies.
    <span className="absolute inset-0 m-auto" style={{ maxWidth: image.width, maxHeight: image.height }}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-contain ${className}`}
      />
    </span>
  );
}
