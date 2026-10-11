/**
 * The upload's AI check, from the command line: the same detector
 * (src/lib/ai-check/signature.ts), with sharp reading the pixels.
 *
 *   npm run ai-check -- <files or folders…>   which images carry an AI generator's marks
 *   npm run ai-check -- requests              open "I made this myself" review requests
 *
 * `requests` uses the Supabase secret key from .env.local (`vercel env pull .env.local`).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { findAiSignature, findStealthSignature, STEALTH_BITS, type AiSignature } from "../src/lib/ai-check/signature.ts";

const IMAGE = /\.(png|jpe?g|webp|gif|avif|heic)$/i;

async function imagesIn(target: string): Promise<string[]> {
  if (!(await stat(target)).isDirectory()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(target, entry.name);
      return entry.isDirectory() ? imagesIn(full) : IMAGE.test(entry.name) ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Settings hidden in the alpha channel: decode only the first columns. */
async function hiddenSettings(file: string): Promise<AiSignature | null> {
  try {
    const { width = 0, height = 0 } = await sharp(file).metadata();
    const columns = Math.min(width, Math.ceil(STEALTH_BITS / Math.max(1, height)));
    if (columns * height < STEALTH_BITS) return null;
    const { data } = await sharp(file)
      .extract({ left: 0, top: 0, width: columns, height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alpha = new Uint8Array(columns * height);
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < height; y++) alpha[x * height + y] = data[(y * columns + x) * 4 + 3];
    }
    return findStealthSignature(alpha);
  } catch {
    return null; // Not an image sharp can decode: the metadata check still ran.
  }
}

async function checkFiles(targets: string[]) {
  const files = (await Promise.all(targets.map(imagesIn))).flat();
  let flagged = 0;
  for (const file of files) {
    const signature = (await findAiSignature(new Uint8Array(await readFile(file)))) ?? (await hiddenSettings(file));
    if (signature) {
      flagged++;
      console.log(`✗ ${file}\n    ${signature.generator} · ${signature.evidence}\n    "${signature.excerpt.slice(0, 120)}"`);
    } else {
      console.log(`✓ ${file}`);
    }
  }
  console.log(`\n${files.length} image${files.length === 1 ? "" : "s"}: ${flagged} with AI marks, ${files.length - flagged} clean.`);
}

type Request = {
  created_at: string;
  file_name: string;
  generator: string;
  evidence: string;
  note: string;
  requester: { handle: string } | null;
};

async function listRequests() {
  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase keys in .env.local. Run `vercel env pull .env.local`.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("ai_review_requests")
    .select("created_at, file_name, generator, evidence, note, requester:profiles!ai_review_requests_requester_id_fkey(handle)")
    .eq("status", "open")
    .order("created_at")
    .returns<Request[]>();
  if (error) throw new Error(error.message);
  if (data.length === 0) console.log("No open review requests.");
  for (const row of data) {
    console.log(
      `${row.created_at.slice(0, 16).replace("T", " ")}  @${row.requester?.handle ?? "?"}  ${row.file_name}\n` +
        `    ${row.generator} · ${row.evidence}${row.note ? `\n    “${row.note}”` : ""}`,
    );
  }
}

const args = process.argv.slice(2);
if (args[0] === "requests") {
  await listRequests();
} else if (args.length > 0) {
  await checkFiles(args);
} else {
  console.log("Usage:\n  npm run ai-check -- <files or folders…>\n  npm run ai-check -- requests");
  process.exitCode = 1;
}
