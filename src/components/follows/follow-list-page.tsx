import { Caveat } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HandNote } from "@/components/explore/doodles";
import { FollowerCount } from "@/components/profile/follow-button";
import { SectionHeader } from "@/components/profile/section-header";
import { listBlurb, type FollowList } from "@/lib/follows/list";
import { getFollowList } from "@/lib/follows/queries";
import { formatCompact } from "@/lib/format";
import { db } from "@/lib/profile/mock-db";
import { getProfile, normalizeHandle } from "@/lib/profile/queries";
import { FollowBinder } from "./follow-binder";

/*
 * `/[handle]/followers` and `/[handle]/following`, opened from the profile's
 * stats card: a trading-card binder with two index tabs. The first page is
 * cached and the same for everyone; who follows whom from the viewer's side
 * (Follow back, Follows you, Also follow you) fills in in the browser.
 */

// The artist's handwriting, for the aside.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

type Params = Promise<{ handle: string }>;

export function FollowListPage({ params, list }: { params: Params; list: FollowList }) {
  return (
    <Suspense fallback={<BinderSkeleton />}>
      <FollowListView params={params} list={list} />
    </Suspense>
  );
}

async function FollowListView({ params, list }: { params: Params; list: FollowList }) {
  const handle = normalizeHandle((await params).handle);
  const [profile, page] = await Promise.all([getProfile(handle), getFollowList(handle, list)]);
  if (!profile) notFound();

  const name = profile.displayName.split(" ")[0];
  // Demo artists' counts start from made-up numbers; only real follows have names.
  const demo = db.profiles.some((p) => p.handle === handle);
  const counted = list === "followers" ? profile.stats.followers : profile.stats.following;
  const sample = demo ? Math.max(0, counted - page.total) : 0;

  return (
    <section className={hand.variable}>
      <SectionHeader
        handle={handle}
        title={list === "followers" ? "Followers" : "Following"}
        description={listBlurb(list, { own: false, name: profile.displayName })}
      />

      <div className="flex items-end justify-between gap-3">
        <nav aria-label={`${profile.displayName}'s follows`} className="relative z-10 -mb-px flex gap-1 pl-3 sm:pl-5 lg:pl-9">
          <IndexTab href={`/${handle}/followers`} current={list === "followers"} label="Followers">
            <FollowerCount handle={handle} count={profile.stats.followers} />
          </IndexTab>
          <IndexTab href={`/${handle}/following`} current={list === "following"} label="Following">
            {formatCompact(profile.stats.following)}
          </IndexTab>
        </nav>
        <HandNote tone="lilac" className="mr-2 mb-1.5 hidden -rotate-3 text-xl sm:inline-block">
          newest first
        </HandNote>
      </div>

      <BinderSheet>
        <FollowBinder
          // A new list (or a new artist) starts from its own first page.
          key={`${handle}:${list}`}
          handle={handle}
          list={list}
          ownerId={profile.id}
          name={name}
          initial={page}
          sample={sample}
        />
      </BinderSheet>
    </section>
  );
}

function IndexTab({
  href,
  current,
  label,
  children,
}: {
  href: string;
  current: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="flex items-baseline gap-2 rounded-t-[14px] border border-b-0 border-transparent bg-ice/70 px-4 pt-2.5 pb-2 text-sm font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:border-border aria-[current=page]:bg-surface aria-[current=page]:text-ink"
    >
      {label}
      <span className="font-display text-[0.9375rem] font-extrabold text-ink tabular-nums">{children}</span>
    </Link>
  );
}

/** A binder page: punched down the left edge on wide screens, the tabs standing up from its top. */
function BinderSheet({ children }: { children: React.ReactNode }) {
  return (
    <div data-part="binder" className="relative rounded-panel rounded-tl-[10px] border border-border bg-surface shadow-soft lg:pl-5">
      {/* Binder holes, punched through the page (the canvas shows through). */}
      <span aria-hidden className="absolute top-10 bottom-10 left-3 hidden flex-col justify-between lg:flex">
        {[0, 1, 2].map((hole) => (
          <span key={hole} className="block size-3.5 rounded-full bg-canvas shadow-[inset_0_1px_2px_rgb(var(--shadow-rgb)/0.25)]" />
        ))}
      </span>
      {children}
    </div>
  );
}

function BinderSkeleton() {
  return (
    <div aria-busy aria-label="Loading the list">
      <div className="skeleton mb-5 h-[5.5rem] w-64 rounded-input bg-ice" />
      <div className="flex gap-1 pl-3 sm:pl-5 lg:pl-9">
        <div className="skeleton h-10 w-32 rounded-t-[14px] bg-ice" />
        <div className="skeleton h-10 w-32 rounded-t-[14px] bg-ice" />
      </div>
      <BinderSheet>
        <ul className="grid grid-cols-2 gap-3 px-4 py-5 sm:grid-cols-3 sm:gap-4 sm:px-6 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="skeleton aspect-[5/7] rounded-[18px] bg-ice" />
          ))}
        </ul>
      </BinderSheet>
    </div>
  );
}
