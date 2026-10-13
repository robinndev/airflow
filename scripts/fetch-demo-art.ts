/**
 * Downloads the third-party demo artwork into public/demo-art/ (git-ignored),
 * and makes a `.thumb.webp` beside each file for walls and cards: the image
 * loader asks for it at small widths (src/lib/images/variants.ts).
 * Run with: npm run demo:art
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { demoImages, demoPool } from "../src/lib/profile/demo-images.ts";
import { DEMO_THUMB_WIDTH } from "../src/lib/images/variants.ts";

const root = path.join(import.meta.dirname, "..", "public");

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

for (const image of [...Object.values(demoImages), ...demoPool]) {
  const target = path.join(root, image.src);
  if (await exists(target)) {
    console.log(`✓ ${image.src} (cached)`);
  } else {
    const res = await fetch(image.remote, {
      headers: { "User-Agent": "artiflow-dev/0.1 (demo artwork fetcher)" },
    });
    if (!res.ok) {
      console.error(`✗ ${image.src}: HTTP ${res.status}`);
      process.exitCode = 1;
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    console.log(`↓ ${image.src}`);
  }

  const thumb = target.replace(/\.[a-z0-9]+$/i, ".thumb.webp");
  if (!(await exists(thumb))) {
    await sharp(target).rotate().resize({ width: DEMO_THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(thumb);
    console.log(`  + thumb`);
  }
}
