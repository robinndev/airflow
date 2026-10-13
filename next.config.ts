import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev:local and the e2e suite build into their own folders so caches never mix (scripts/dev.ts, playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Art comes straight from storage's CDN as uploaded (the thumb or the display copy, by width);
    // Vercel's optimizer is off. See src/lib/images/variants.ts.
    loader: "custom",
    loaderFile: "./src/lib/images/loader.ts",
  },
  // The feed lives on the home page; this was its placeholder.
  async redirects() {
    return [{ source: "/explore/feed", destination: "/?feed=following", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
