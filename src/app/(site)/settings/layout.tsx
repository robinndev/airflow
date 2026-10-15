import { Caveat } from "next/font/google";
import { Settings } from "lucide-react";
import { Suspense } from "react";
import { Scribble, Sparkle, Wash } from "@/components/explore/doodles";
import { CoverFallback, InsideCover } from "@/components/settings/inside-cover";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { SiteHeader } from "@/components/site/site-header";

// The artist's handwriting: the hand-lettered title and the asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

const container = "mx-auto w-full max-w-[1184px] px-4 sm:px-6";

/*
 * Settings, kept like a sketchbook's binder: the inside cover says whose it
 * is, index tabs open each part. The masthead and tabs prerender; the cover
 * and every sheet are the viewer's own and stream in. The layout persists
 * across tabs, so only the sheet changes.
 */
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <SiteHeader />
      <main className={`${hand.variable} overflow-x-clip pb-28`}>
        <section
          aria-labelledby="settings-heading"
          className="grain relative -mt-16 pt-16 before:[mask-image:linear-gradient(black_55%,transparent)]"
        >
          <Wash id="settings-wash" className="top-[-25%] right-[-16%] h-[120%] w-[62%] opacity-60 max-lg:w-[120%]" />
          <div className={`${container} relative pt-10 pb-8 sm:pt-14`}>
            <p className="flex items-center gap-2 text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
              <Settings aria-hidden className="size-3.5 text-ocean" />
              Settings
            </p>
            <h1
              id="settings-heading"
              className="mt-4 font-display text-[2.5rem] leading-[1] font-extrabold tracking-[-0.035em] text-ink sm:text-[3.5rem]"
            >
              Your studio,{" "}
              <span className="relative inline-block font-hand text-[1.25em] leading-[0.8] font-bold tracking-normal text-ocean">
                your rules.
                <Scribble className="absolute -bottom-2.5 left-[-4%] w-[108%] text-mint" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
              How you sign in, what gets signed into your guest book, what other people can see, and how Artiflow looks on this device.
            </p>
            <Sparkle className="absolute top-16 left-[58%] hidden size-5 text-lilac lg:block" />
          </div>
        </section>

        <div className={`${container} grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8`}>
          <aside className="grid min-w-0 gap-5 lg:sticky lg:top-24 lg:gap-6">
            <Suspense fallback={<CoverFallback />}>
              <InsideCover />
            </Suspense>
            <SettingsTabs />
          </aside>
          <div className="min-w-0 max-lg:-mt-5">{children}</div>
        </div>
      </main>
    </>
  );
}
