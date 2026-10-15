import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { BackOffice } from "@/components/admin/back-office";
import { Scribble, Wash } from "@/components/explore/doodles";
import { SiteHeader } from "@/components/site/site-header";
import { parseAdmin } from "@/lib/admin/range";
import { getAdminDashboard } from "@/lib/admin/server";
import { requireAdmin } from "@/lib/admin/team";

// The hand-lettered word in the title.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Back office",
  robots: { index: false, follow: false },
};

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * The team's back office: accounts, activity, commissions, the shop and the
 * money, for admins only (`team_members`). Nothing prerenders but an empty
 * frame: the title waits behind the admin check too, so the page says
 * nothing to anyone else (they get the site's 404; visitors, sign in).
 */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <Suspense fallback={<BackOfficeSkeleton />}>
          <Admin searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Admin({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const viewer = await requireAdmin();
  const query = parseAdmin(await searchParams);
  const dash = await getAdminDashboard(query);

  return (
    <>
      <section aria-labelledby="admin-heading" className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]">
        <Wash id="admin-wash" className="top-[-30%] right-[-14%] h-[150%] w-[64%] opacity-70 max-lg:w-[120%]" />
        <div className={`${container} relative pt-10 pb-8 sm:pt-14`}>
          <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
            <ShieldCheck aria-hidden className="size-3.5 text-ocean" />
            Back office · team only
          </p>
          <h1
            id="admin-heading"
            className="mt-4 font-display text-[2.5rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink sm:text-[3.5rem]"
          >
            How we&apos;re{" "}
            <span className="relative inline-block font-hand text-[1.3em] leading-[0.8] font-bold tracking-normal text-ocean">
              doing.
              <Scribble className="absolute right-[-6%] -bottom-3 w-[92%] text-mint" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-pretty text-muted">
            Who joined, who came back, what was commissioned, adopted and bought, and what Artiflow keeps. Hi,{" "}
            <span className="font-semibold text-ink">@{viewer.handle}</span>.
          </p>
        </div>
      </section>

      <div className={container}>
        <BackOffice dash={dash} query={query} />
      </div>
    </>
  );
}

function BackOfficeSkeleton() {
  return (
    <div aria-hidden className={`${container} pt-12`}>
      <div className="skeleton h-4 w-40 rounded-full" />
      <div className="skeleton mt-5 h-14 w-80 max-w-full rounded-[12px]" />
      <div className="skeleton mt-10 h-12 w-full rounded-full" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="skeleton h-[30rem] rounded-[6px]" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-40 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
