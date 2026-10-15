import { BannerScrims } from "./profile-hero";

/*
 * Fallbacks for the App Shell. They mirror the real layout's geometry so the
 * page doesn't shift when profile data streams in (CLS ≈ 0).
 */

const pulse = "skeleton bg-ice";

export function ProfileSkeleton() {
  return (
    // The header above it is the layout's, shared with the profile once it arrives.
    <div aria-busy aria-label="Loading profile">
      <div className={`relative -mt-16 h-[clamp(15rem,30vw,24rem)] ${pulse}`}>
        <BannerScrims />
      </div>
      <div className="mx-auto max-w-[1184px] px-4 sm:px-6 lg:px-8">
        <div className="skeleton -mt-14 size-28 rounded-full bg-ice-strong ring-[5px] ring-surface sm:-mt-20 sm:size-38" />
        <div className={`mt-4 h-8 w-56 rounded-input ${pulse}`} />
        <div className={`mt-2 h-4 w-32 rounded-input ${pulse}`} />
        <div className={`mt-5 h-4 w-full max-w-xl rounded-input ${pulse}`} />
        <div className={`mt-2 h-4 w-2/3 max-w-md rounded-input ${pulse}`} />
      </div>
      <div className="mx-auto mt-8 grid max-w-[1184px] gap-6 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <div className="hidden gap-4 lg:grid">
          <div className={`h-72 rounded-card ${pulse}`} />
          <div className={`h-56 rounded-card ${pulse}`} />
        </div>
        <FeedSkeleton />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div aria-busy aria-label="Loading posts" className="grid gap-5">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className={`size-11 rounded-full ${pulse}`} />
            <div className="grid gap-1.5">
              <div className={`h-4 w-32 rounded-input ${pulse}`} />
              <div className={`h-3 w-20 rounded-input ${pulse}`} />
            </div>
          </div>
          <div className={`mt-4 h-4 w-11/12 rounded-input ${pulse}`} />
          <div className={`mt-2 h-4 w-3/5 rounded-input ${pulse}`} />
          <div className={`mt-4 aspect-[4/3] rounded-[12px] ${pulse}`} />
        </div>
      ))}
    </div>
  );
}
