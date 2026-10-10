import { Globe } from "lucide-react";
import type { SVGProps } from "react";
import type { SocialPlatform } from "@/lib/profile/types";

/*
 * Line-style glyphs drawn to match lucide's 24px / 2px stroke grid, so brand
 * icons sit next to UI icons without looking like a different family.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Svg(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

const glyphs: Record<Exclude<SocialPlatform, "website">, (p: IconProps) => React.ReactNode> = {
  instagram: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </Svg>
  ),
  tiktok: (p) => (
    <Svg {...p}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.7 2.3 4.6 5 4.8" />
    </Svg>
  ),
  x: (p) => (
    <Svg {...p}>
      <path d="M4 4h4.5L20 20h-4.5Z" />
      <path d="m20 4-6.6 7.3M4 20l6.6-7.3" />
    </Svg>
  ),
  youtube: (p) => (
    <Svg {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5Z" />
    </Svg>
  ),
  twitch: (p) => (
    <Svg {...p}>
      <path d="M4 3h16v11l-4 4h-4l-3 3v-3H4Z" />
      <path d="M11 7.5v3.5M16 7.5v3.5" />
    </Svg>
  ),
  bluesky: (p) => (
    <Svg {...p}>
      <path d="M12 11.5C10.6 8.6 7.1 5 4.5 5 3.4 5 3.5 6.4 3.5 7.3c0 1.4.6 4.5 4 5-3 .6-3.4 3-1.5 4.4 2.5 1.9 4.4-.6 6-4 1.6 3.4 3.5 5.9 6 4 1.9-1.4 1.5-3.8-1.5-4.4 3.4-.5 4-3.6 4-5 0-.9.1-2.3-1-2.3-2.6 0-6.1 3.6-7.5 6.5Z" />
    </Svg>
  ),
  kofi: (p) => (
    <Svg {...p}>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M10.5 15s-2.5-1.4-2.5-3a1.25 1.25 0 0 1 2.5-.3 1.25 1.25 0 0 1 2.5.3c0 1.6-2.5 3-2.5 3Z" />
    </Svg>
  ),
};

export function SocialIcon({
  platform,
  ...props
}: IconProps & { platform: SocialPlatform }) {
  if (platform === "website") return <Globe aria-hidden {...props} />;
  return glyphs[platform](props);
}
