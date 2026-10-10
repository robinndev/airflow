import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { FollowButton } from "@/components/profile/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { ProStar } from "@/components/ui/pro-badge";
import { formatCompact, formatUsd } from "@/lib/format";
import { getAllProfiles, getOpenServices } from "@/lib/profile/queries";
import type { ArtistProfile } from "@/lib/profile/types";
import { getFollowing } from "@/lib/social";
import { getViewer } from "@/lib/session";

const card = "overflow-hidden rounded-[20px] border border-border bg-surface";

function WidgetTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-4 pt-4 pb-2 font-display text-lg font-extrabold text-ink">{children}</h2>;
}

function ShowMore({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-3.5 text-sm font-semibold text-accent-strong transition-colors hover:bg-canvas"
    >
      Show more
    </Link>
  );
}

export function FeedSearch() {
  return (
    <form role="search" action="/explore/search" className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-[1.125rem] -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        name="q"
        aria-label="Search Artiflow"
        placeholder="Search Artiflow"
        className="h-11 w-full rounded-full border border-transparent bg-surface pr-4 pl-11 text-sm text-ink shadow-soft outline-none transition-colors placeholder:text-muted/80 focus:border-ocean"
      />
    </form>
  );
}

/** Viewer-specific (excludes you and people you follow) — render inside <Suspense>. */
export async function SuggestedArtists({ variant = "card" }: { variant?: "card" | "strip" }) {
  const [viewer, profiles] = await Promise.all([getViewer(), getAllProfiles()]);
  const skip = new Set([viewer?.handle, ...(viewer ? getFollowing(viewer.handle) : [])]);
  const suggestions = profiles.filter((p) => !skip.has(p.handle)).slice(0, 4);
  if (suggestions.length === 0) return null;

  if (variant === "strip") {
    return (
      <section aria-labelledby="suggested-strip" className="border-b border-border bg-surface py-4">
        <h2 id="suggested-strip" className="px-4 font-display text-lg font-extrabold text-ink sm:px-5">
          Suggested artists
        </h2>
        <ul className="mt-3 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:px-5">
          {suggestions.map((p) => (
            <li key={p.handle} className="w-40 shrink-0 rounded-[18px] border border-border p-4 text-center">
              <Link href={`/${p.handle}`} className="relative mx-auto block w-fit">
                <Avatar image={p.avatar} size={64} className="size-16" />
                {p.plan === "pro" && <ProStar size="sm" />}
              </Link>
              <p className="mt-2.5 truncate font-display text-sm font-bold text-ink">{p.displayName}</p>
              <p className="truncate text-xs text-muted">{formatCompact(p.stats.followers)} followers</p>
              <div className="mt-3 flex justify-center">
                <FollowButton handle={p.handle} compact />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="suggested-heading" className={card}>
      <WidgetTitle>
        <span id="suggested-heading">Artists to follow</span>
      </WidgetTitle>
      <ul>
        {suggestions.map((p) => (
          <li key={p.handle} className="px-4 py-3 transition-colors hover:bg-canvas">
            <SuggestedRow profile={p} />
          </li>
        ))}
      </ul>
      <ShowMore href="/explore/popular" />
    </section>
  );
}

function SuggestedRow({ profile: p }: { profile: ArtistProfile }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/${p.handle}`} className="relative shrink-0">
        <Avatar image={p.avatar} size={40} className="size-10" />
        {p.plan === "pro" && <ProStar size="sm" />}
      </Link>
      <Link href={`/${p.handle}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink hover:underline">{p.displayName}</p>
        <p className="truncate text-xs text-muted">{p.headline}</p>
      </Link>
      <FollowButton handle={p.handle} compact />
    </div>
  );
}

export async function OpenCommissions() {
  const [services, profiles] = await Promise.all([getOpenServices(3), getAllProfiles()]);
  const byHandle = new Map(profiles.map((p) => [p.handle, p]));

  return (
    <section aria-labelledby="open-commissions-heading" className={card}>
      <WidgetTitle>
        <span id="open-commissions-heading">Open commissions</span>
      </WidgetTitle>
      <ul>
        {services.map((service) => {
          const artist = byHandle.get(service.ownerHandle);
          const cover = service.examples[0];
          return (
            <li key={service.id}>
              <Link
                href={`/${service.ownerHandle}/commissions#${service.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas"
              >
                {cover && (
                  <Image
                    src={cover.src}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 shrink-0 rounded-[12px] bg-ice object-cover"
                    style={{ objectPosition: cover.focus ?? "50% 25%" }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{service.title}</span>
                  <span className="block truncate text-xs text-muted">by @{artist?.handle}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-ink">
                    from {formatUsd(service.priceFromUsd)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <ShowMore href="/explore/commissions" />
    </section>
  );
}

const TAGS = [
  { tag: "oc", posts: 12400 },
  { tag: "adoptables", posts: 8300 },
  { tag: "fantasyart", posts: 6100 },
  { tag: "chibi", posts: 4900 },
  { tag: "backgrounds", posts: 3200 },
  { tag: "furry", posts: 2800 },
  { tag: "ych", posts: 1900 },
];

export function TrendingTags() {
  return (
    <section aria-labelledby="trending-heading" className={card}>
      <WidgetTitle>
        <span id="trending-heading">Trending in art</span>
      </WidgetTitle>
      <ol>
        {TAGS.slice(0, 5).map(({ tag, posts }, i) => (
          <li key={tag}>
            <Link href="/explore/popular" className="block px-4 py-2.5 transition-colors hover:bg-canvas">
              <span className="block text-xs text-muted">{i + 1} · Trending</span>
              <span className="block text-[0.9375rem] font-bold text-ink">#{tag}</span>
              <span className="block text-xs text-muted">{formatCompact(posts)} posts</span>
            </Link>
          </li>
        ))}
      </ol>
      <ShowMore href="/explore/popular" />
    </section>
  );
}
