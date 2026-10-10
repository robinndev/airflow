import Image from "next/image";
import type { ImageAsset } from "@/lib/profile/types";

type AvatarProps = {
  image: ImageAsset;
  size: number;
  className?: string;
  preload?: boolean;
};

export function Avatar({ image, size, className = "", preload }: AvatarProps) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={size}
      height={size}
      preload={preload}
      style={image.focus ? { objectPosition: image.focus } : undefined}
      className={`aspect-square shrink-0 rounded-full bg-ice object-cover ${className}`}
    />
  );
}
