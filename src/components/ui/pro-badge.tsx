import { Star } from "lucide-react";

const SIZES = {
  lg: "size-8 ring-4 sm:size-10 [&_svg]:size-4 sm:[&_svg]:size-5",
  sm: "size-[18px] ring-2 [&_svg]:size-2.5",
} as const;

/**
 * Pro marker that sits on the avatar's rim at 45° (top-right).
 * Place it inside the avatar's `relative` wrapper; the parent needs the
 * `group/avatar` class for the hover twirl.
 */
export function ProStar({ size = "lg" }: { size?: keyof typeof SIZES }) {
  return (
    <span
      title="Pro artist"
      className={`pointer-events-auto absolute z-10 top-[14.6%] left-[85.4%] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-lilac to-ocean text-white shadow-soft ring-white ${SIZES[size]}`}
    >
      <Star
        aria-hidden
        className="fill-current transition-transform duration-500 ease-out group-hover/avatar:rotate-[72deg]"
      />
      <span className="sr-only">Pro artist</span>
    </span>
  );
}
