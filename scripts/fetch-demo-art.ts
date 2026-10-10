/**
 * Downloads the third-party demo artwork into public/demo-art/ (git-ignored).
 * Run with: npm run demo:art
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { demoImages } from "../src/lib/profile/demo-images.ts";

const root = path.join(import.meta.dirname, "..", "public");

for (const image of Object.values(demoImages)) {
  const target = path.join(root, image.src);
  try {
    await access(target);
    console.log(`✓ ${image.src} (cached)`);
    continue;
  } catch {}

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
