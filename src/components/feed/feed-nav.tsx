import Link from "next/link";
import { Bookmark, Brush, Compass, House, PenLine, Tag, Users, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon; active?: boolean }[] = [
  { href: "/", label: "Home", icon: House, active: true },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/?feed=following", label: "Following", icon: Users },
  { href: "/explore/commissions", label: "Commissions", icon: Brush },
  { href: "/explore/adoptables", label: "Adoptables", icon: Tag },
  { href: "/explore/saved", label: "Saved", icon: Bookmark },
];

export function FeedNav() {
  return (
    <nav aria-label="Feed" className="grid gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className="group flex w-fit items-center gap-4 rounded-full py-2.5 pr-5 pl-3 text-lg text-ink transition-colors hover:bg-surface aria-[current=page]:font-bold"
        >
          <Icon
            aria-hidden
            className={`size-6 ${active ? "text-ocean [&>*]:fill-ocean/15" : "text-ink/80"}`}
            strokeWidth={active ? 2.25 : 1.85}
          />
          {label}
        </Link>
      ))}
      <a
        href="#composer"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-ocean text-[0.9375rem] font-bold text-white shadow-soft transition hover:brightness-95"
      >
        <PenLine aria-hidden className="size-[1.125rem]" />
        Post
      </a>
    </nav>
  );
}
