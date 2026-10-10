/**
 * Extracts the dominant colors of every demo image (public/demo-art/) and
 * checks them against the `palette` values stored in demo-images.ts.
 * Run with: npm run demo:palettes
 *
 * The algorithm lives in src/lib/images/extract-palette.ts, shared with the
 * browser, which runs it on every image someone posts.
 */
import path from "node:path";
import sharp from "sharp";
import { SAMPLE_SIZE, extractPalette } from "../src/lib/images/extract-palette.ts";
import { demoImages, demoPool } from "../src/lib/profile/demo-images.ts";

async function paletteOf(file: string) {
  const { data, info } = await sharp(file)
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return extractPalette(data, info.width, info.height);
}

const root = path.join(import.meta.dirname, "..", "public");
let mismatches = 0;

for (const image of [...Object.values(demoImages), ...demoPool]) {
  let palette: string[];
  try {
    palette = await paletteOf(path.join(root, image.src));
  } catch {
    console.error(`✗ ${image.src}: missing — run npm run demo:art first`);
    process.exitCode = 1;
    continue;
  }
  if (JSON.stringify(palette) === JSON.stringify(image.palette)) {
    console.log(`✓ ${image.src}`);
  } else {
    mismatches++;
    console.log(`≠ ${image.src}\n    stored:    ${JSON.stringify(image.palette ?? null)}\n    extracted: ${JSON.stringify(palette)}`);
  }
}

if (mismatches) console.log(`\n${mismatches} palette(s) differ from demo-images.ts — paste the extracted values to update them.`);
