import Image from "next/image";
import type { ImageAsset } from "@/lib/profile/types";

/**
 * Small images (chibis, pixel art) and GIFs go out as uploaded: the
 * optimizer's lossy re-encode smears the first, and the second would only
 * pass through it.
 */
function asUploaded(image: Pick<ImageAsset, "src" | "width" | "height">) {
  return /\.gif(\?|$)/i.test(image.src) || Math.max(image.width, image.height) <= 640;
}

/**
 * A listing's picture (commission example, adoptable) in its box: whole,
 * never cropped, never enlarged past its real size, and see-through parts
 * showing the box behind it. Fills the nearest positioned parent, centered.
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
        unoptimized={asUploaded(image)}
        className={`object-contain ${className}`}
      />
    </span>
  );
}
