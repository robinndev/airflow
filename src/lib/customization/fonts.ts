import { Caveat, Fraunces, Silkscreen } from "next/font/google";

/*
 * Faces artists can pick for their name and About board. Loaded only on the
 * pages that show customized profiles (profile, customizer, shop) and never
 * preloaded: a file downloads only when a profile actually uses it.
 */

const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap", preload: false });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", preload: false });
const pixel = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-pixel", display: "swap", preload: false });

export const profileFontVariables = `${hand.variable} ${serif.variable} ${pixel.variable}`;
