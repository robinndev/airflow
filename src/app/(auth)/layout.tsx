import Link from "next/link";
import { Caveat } from "next/font/google";
import { AuthSheet } from "@/components/auth/auth-sheet";
import { CuttingMat } from "@/components/auth/cutting-mat";
import { DeskArt } from "@/components/auth/desk-art";
import { DESK_LIGHT_ID } from "@/components/auth/light";
import { Logo } from "@/components/site/logo";
import { ThemeMenu } from "@/components/site/theme-menu";
import { getExploreData } from "@/lib/explore";
import { glowOf } from "@/lib/palette";

// The artist's handwriting: notes on the desk, pencil signatures, asides.
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

/*
 * Sign in and join happen at the artist's desk: a cutting mat lit by the art
 * lying on it, the community's prints (or your own blank canvas) on one side
 * and the sheet you fill in on the other. The layout persists between the
 * two routes, so switching tabs only swaps the sheet and the art.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { hero } = await getExploreData();
  const pieces = hero.map((piece) => ({ ...piece, glow: glowOf(piece.image.palette) }));

  return (
    <div className={`${hand.variable} relative isolate flex min-h-dvh flex-col overflow-x-clip`}>
      <div id={DESK_LIGHT_ID} aria-hidden className="ambient-light pointer-events-none fixed inset-0 -z-20">
        <div className="grain size-full" />
      </div>
      <CuttingMat />

      <header className="flex items-center justify-between gap-3 pt-11 pr-4 pl-4 sm:pr-8 sm:pl-14">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-2">
          <Link
            href="/explore"
            className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-ink"
          >
            Explore
          </Link>
          <ThemeMenu />
        </nav>
      </header>

      <main className="mx-auto grid w-full grid-cols-1 max-w-[1240px] flex-1 content-center items-center gap-x-16 px-4 pt-4 pb-20 sm:pr-8 sm:pl-14 lg:grid-cols-[minmax(0,1fr)_minmax(400px,468px)] lg:pt-2">
        <DeskArt pieces={pieces} />
        <AuthSheet>{children}</AuthSheet>
      </main>
    </div>
  );
}
