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

## Planned: extract the palette when someone posts

The home feed is lit by each artwork's colors: the page background, the palette rail, the glow under the art and the like splash all read `ImageAsset.palette` (see "Home feed" in `CLAUDE.md`). Today only the demo images have a palette, precomputed once and stored in `src/lib/profile/demo-images.ts`.

### The gap

When someone posts from the composer, `createPost` (`src/app/(site)/[handle]/actions.ts`) saves the image **without a palette**. The post works, but it loses the effect:

- its label has no "Palette" row (and no mood);
- the room light doesn't change when it's in view;
- it's left out of the palette rail;
- the glow under the art falls back to the default ocean blue;
- the like splash only uses the default `like` pink.

### What the artist fills in

Confirmed, and it stays this way:

- **text** (the first paragraph is shown as the piece's title; there is no separate title field);
- **stage**: Finished / WIP / Sketch / Update;
- **one image**.

The artist never picks colors. The system extracts them.

### How to build it

1. **Extract in the browser for now.** The image already goes through a canvas in `downscaleImage` (`src/lib/images/downscale.ts`), so sample it there and send the palette with the image as a hidden field.
2. **Validate on the server.** `createPost` accepts at most 5 colors, each `#rrggbb`, and stores them in `media[i].palette`.
3. **Match the demo palettes.** Port `extractPalette()` from `scripts/extract-palettes.ts` (a pure function: RGB pixels in, hex colors out). `npm run demo:palettes` checks it against every stored demo palette. In short:
   - downscale to 72 px on the long side;
   - k-means in CIELAB, K = 8, deterministic k-means++ seeding, 20 iterations;
   - drop clusters under 1% of pixels and merge near-duplicates (ΔE < 14);
   - drop the flat backdrop (white paper, cream): take the median color of the border pixels. If it's light (L > 70) and over 70% of the border is within ΔE 10 of it, the image has a flat backdrop, so remove clusters within ΔE 14 of that color. Dark uniform borders, like a night sky, are part of the art and stay;
   - keep the top 5, most prominent first.
4. **Move it to the server later.** When direct-to-storage uploads land (roadmap: "Media upload & delivery"), run the extraction in the upload pipeline instead, so palettes can't be spoofed. Gallery uploads need it too, since the Explore "Browse by palette" wall reads the same field.

Done when a new post with an image shows its palette chips and mood, lights the room, appears on the rail, glows in its own colors and splashes them on like. Text-only posts keep working as they do now.

### Later

Publishing a **commission** (or an adoptable) from the composer. The data model already supports it (`Post.embed`), and the feed already renders it as the ticket / hang tag, but the composer can't attach one yet.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
