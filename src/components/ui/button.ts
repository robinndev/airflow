type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-action font-semibold whitespace-nowrap transition-[background-color,filter,border-color,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.125em] [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  // The `action-*` markers let a profile restyle each kind of button (style and colors, see globals.css).
  primary: "action-primary bg-accent text-on-accent hover:brightness-[0.94] active:brightness-90",
  secondary: "action-secondary border border-border bg-surface text-ink hover:border-sky/60 hover:bg-ice/60",
  soft: "action-soft bg-ice text-ink hover:bg-ice-strong",
  ghost: "text-muted hover:bg-ice hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[0.9375rem]",
  icon: "size-10",
};

/**
 * Class recipe shared by <button> and <Link>. Shapes follow the profile's
 * `--profile-radius-action` so Pro artists can restyle every action at once.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}
