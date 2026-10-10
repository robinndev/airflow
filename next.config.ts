import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
// `npm run dev:local` / e2e: storage is served from this machine over http.
const localSupabase = supabase !== null && ["127.0.0.1", "localhost"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  // dev:local and the e2e suite build into their own folders so caches never mix (scripts/dev.ts, playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Art uploaded to Supabase Storage (public `art` bucket).
    remotePatterns: supabase
      ? [
          {
            protocol: localSupabase ? "http" : "https",
            hostname: supabase.hostname,
            port: supabase.port,
            pathname: "/storage/v1/object/public/art/**",
          },
        ]
      : [],
    // Next 16 refuses to optimize images from private IPs; only the local stack needs it.
    dangerouslyAllowLocalIP: localSupabase,
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
