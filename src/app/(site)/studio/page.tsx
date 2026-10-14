import Link from "next/link";
import { redirect } from "next/navigation";
import { Caveat } from "next/font/google";
import { Suspense } from "react";
import { HandNote, Scribble } from "@/components/explore/doodles";
import { SiteHeader } from "@/components/site/site-header";
import { CodeSheet } from "@/components/artists/code-sheet";
import { StudioDesk } from "@/components/studio/studio-desk";
import { getAdoptables, getProfile, getServices } from "@/lib/profile/queries";
import { getViewerAccess } from "@/lib/artists/server";
import { getViewer } from "@/lib/session";

// The artist's handwriting, for the margin notes.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = { title: "Your studio" };

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/** Where an artist lists what they sell: commission services and adoptables. */
export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-24`}>
        <section className="grain relative -mt-16 pt-16">
          <div className={`${container} pt-10 pb-4 sm:pt-14`}>
            <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase">Your studio</p>
            <h1 className="mt-2 font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.03em] text-ink sm:text-[3.5rem]">
              Open your{" "}
              <span className="relative inline-block font-hand text-[1.25em] leading-[0.8] font-bold tracking-normal text-ocean">
                doors.
                <Scribble className="absolute -bottom-2 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
              Two ways to sell here, and buyers see the difference before they click.
            </p>
            <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
              <HowItSells
                kicker="Made to order"
                title="Commissions"
                steps={["They request", "You quote", "They pay", "You draw it"]}
                tone="bg-sky/15 text-sky-ink"
              />
              <HowItSells
                kicker="Ready-made"
                title="Adoptables"
                steps={["They pay", "It's theirs"]}
                tone="bg-lilac/15 text-lilac-ink"
                note="no waiting ✶"
              />
            </div>
          </div>
        </section>

        <div className={container}>
          <Suspense fallback={<DeskSkeleton />}>
            <Desk />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Desk() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/studio");
  const [profile, services, adoptables, access] = await Promise.all([
    getProfile(viewer.handle),
    getServices(viewer.handle),
    getAdoptables(viewer.handle),
    getViewerAccess(),
  ]);
  if (!profile) redirect("/join/handle?next=/studio");

  // Selling takes artist access: without it, the studio is the code sheet.
  if (!access?.artist) {
    return (
      <div className="mt-8 space-y-6">
        <CodeSheet handle={viewer.handle} />
        {(services.length > 0 || adoptables.length > 0) && (
          <StudioDesk
            artist={{ handle: profile.handle, name: profile.displayName, avatar: profile.avatar }}
            services={services}
            adoptables={adoptables}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm text-muted">
        Listed on{" "}
        <Link href={`/${viewer.handle}/commissions`} className="font-semibold text-ink underline-offset-4 hover:underline">
          your profile
        </Link>{" "}
        and in{" "}
        <Link href="/explore/search" className="font-semibold text-ink underline-offset-4 hover:underline">
          search
        </Link>{" "}
        as soon as you save. Checkout opens soon: until then buyers can request and save, not pay.
      </p>
      <StudioDesk
        artist={{ handle: profile.handle, name: profile.displayName, avatar: profile.avatar }}
        services={services}
        adoptables={adoptables}
      />
    </>
  );
}

function HowItSells({
  kicker,
  title,
  steps,
  tone,
  note,
}: {
  kicker: string;
  title: string;
  steps: string[];
  tone: string;
  note?: string;
}) {
  return (
    <div className="relative rounded-[18px] border border-border bg-surface px-4 py-3.5 shadow-soft">
      <p className="text-[0.625rem] font-bold tracking-[0.16em] text-muted uppercase">{kicker}</p>
      <p className="font-display text-lg font-extrabold text-ink">{title}</p>
      <ol className="mt-2 flex flex-wrap items-center gap-1 text-xs font-semibold">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-muted">→</span>}
            <span className={`rounded-full px-2 py-0.5 ${tone}`}>{step}</span>
          </li>
        ))}
      </ol>
      {note && <HandNote className="absolute -top-3 right-4 rotate-3 text-xl">{note}</HandNote>}
    </div>
  );
}

function DeskSkeleton() {
  return (
    <div aria-busy aria-label="Loading your studio" className="mt-14">
      <div className="skeleton h-16 w-80 max-w-full rounded-input bg-ice" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-96 rounded-[24px] bg-ice" />
        ))}
      </div>
    </div>
  );
}
