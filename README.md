This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Posts: what's built and what's next

The home feed is lit by each artwork's colors: the page background, the palette rail, the glow under the art and the like splash all read `ImageAsset.palette` (see "Home feed" in `CLAUDE.md`).

### What the artist fills in

Confirmed, and it stays this way:

- **text** (the first paragraph is shown as the piece's title; there is no separate title field);
- **stage**: Finished / WIP / Sketch / Update;
- **up to four images**, laid out as justified rows that never crop.

The artist never picks colors. The system extracts them.

### Built

- **Palette extraction on post.** The browser prepares each image (`src/lib/images/prepare.ts`: resize, WebP, palette via `extract-palette.ts`) and the server validates it (at most 8 colors, each `#rrggbb`). `npm run demo:palettes` checks the same algorithm against every demo image:
  - downscale to 72 px on the long side;
  - k-means in CIELAB, K = 8, deterministic k-means++ seeding, 20 iterations;
  - drop clusters under 1% of pixels and merge near-duplicates (ΔE < 14);
  - drop the flat backdrop (white paper, cream): take the median color of the border pixels. If it's light (L > 70) and over 70% of the border is within ΔE 10 of it, the image has a flat backdrop, so remove clusters within ΔE 14 of that color. Dark uniform borders, like a night sky, are part of the art and stay;
  - keep the top 5, most prominent first.
- **Comments with replies** (one level deep). Authors can delete any comment on their own posts.
- **Reposts**, with an optional note, shown as a polaroid of the original.

### Next

- **Extract palettes on the server.** When uploads go through a server pipeline (roadmap: "Media upload & delivery"), run the extraction there so palettes can't be spoofed. Gallery uploads need it too, since the Explore "Browse by palette" wall reads the same field.
- **Attach a commission (or an adoptable) from the composer.** The data model already supports it (`Post.embed`), and the feed already renders it as the ticket / hang tag, but the composer can't attach one yet.
- **Persist likes and saves.** They're UI-only for now.
- **Drop the demo columns.** `comments.demo_post_id` and `posts.quote_demo_post_id` let people comment on and repost the demo artists' posts; remove them with the demo data.
- **Drop `posts.image_*`.** Kept filled with the first image for deployments that predate `posts.images`; drop them once every deployment reads `images`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
