/**
 * Team tools for uploaded art (roadmap: "original images, cheap and safe").
 *
 *   npm run images -- thumbs            what would get a thumb (dry run)
 *   npm run images -- thumbs --apply    make the thumbs and save them on the rows
 *   npm run images -- backup            copy new files to the backup bucket now (what the hourly cron does)
 *   npm run images -- backup --sweep    let go of files deleted 30+ days ago (the daily cron)
 *
 * `thumbs` gives pictures uploaded before thumbs existed a thumb, the way
 * prepareImage() makes them now: posts, gallery pieces, service examples,
 * adoptables (1024px) and profile pictures (192px) and covers (1024px). GIFs
 * get their first frame. Originals can't be backfilled: only the display
 * copy was kept.
 *
 * Uses .env.local (production, `vercel env pull .env.local`; the backup
 * also needs its BACKUP_S3_* variables there); add `--local` for the local
 * stack.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readLocalSupabase } from "./lib/local-supabase.ts";
import { THUMB_MAX, thumbPathOf, type ThumbInfo } from "../src/lib/images/variants.ts";
import { copyNewFiles, sweepDeleted } from "../src/lib/backup/art.ts";
import { backupTargetFromEnv } from "../src/lib/backup/s3.ts";

type Image = { path: string; width: number; height: number; palette?: string[] | null; thumb?: ThumbInfo | null; original?: unknown };

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const AVATAR_THUMB = 192;

function connect(): { supabase: SupabaseClient; url: string } {
  if (args.includes("--local")) {
    const local = readLocalSupabase();
    if (!local) throw new Error("The local stack isn't running (npx supabase start).");
    return { supabase: createClient(local.apiUrl, local.secretKey, { auth: { persistSession: false } }), url: local.apiUrl };
  }
  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase keys in .env.local. Run `vercel env pull .env.local`.");
  return { supabase: createClient(url, key, { auth: { persistSession: false } }), url };
}

const { supabase, url } = connect();

/** Makes and uploads the thumb, or null when the picture is small enough already. */
async function thumbFor(image: Image, size: number): Promise<ThumbInfo | null> {
  const gif = image.path.endsWith(".gif");
  if (image.thumb || (!gif && Math.max(image.width, image.height) <= size)) return null;
  const res = await fetch(`${url}/storage/v1/object/public/art/${image.path}`);
  if (!res.ok) {
    console.warn(`  ✗ ${image.path}: HTTP ${res.status}`);
    return null;
  }
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()), { pages: 1 })
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb: ThumbInfo = { width: info.width, height: info.height, type: "image/webp" };
  if (!apply) return thumb;
  const { error } = await supabase.storage
    .from("art")
    .upload(thumbPathOf(image.path, thumb), data, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (error) {
    console.warn(`  ✗ ${image.path}: ${error.message}`);
    return null;
  }
  return thumb;
}

/** Adds thumbs to a jsonb column holding one image or a list of them. */
async function backfill(table: string, column: string, size: number) {
  const { data, error } = await supabase.from(table).select(`id, ${column}`).not(column, "is", null);
  if (error) {
    console.warn(`${table}.${column}: ${error.message}`);
    return 0;
  }
  let made = 0;
  for (const row of data as unknown as Record<string, unknown>[]) {
    const value = row[column] as Image | Image[];
    const list = Array.isArray(value) ? value : [value];
    let changed = false;
    const next: Image[] = [];
    for (const image of list) {
      const thumb = image?.path ? await thumbFor(image, size) : null;
      if (thumb) {
        changed = true;
        made++;
        console.log(`  ${apply ? "+" : "·"} ${table}.${column} ${image.path} → ${thumb.width}×${thumb.height}`);
      }
      next.push(thumb ? { ...image, thumb } : image);
    }
    if (changed && apply) {
      const { error: saveError } = await supabase
        .from(table)
        .update({ [column]: Array.isArray(value) ? next : next[0] })
        .eq("id", row.id as string);
      if (saveError) console.warn(`  ✗ saving ${table} ${row.id}: ${saveError.message}`);
    }
  }
  return made;
}

if (args[0] === "thumbs") {
  let total = 0;
  for (const [table, column, size] of [
    ["posts", "images", THUMB_MAX],
    ["artworks", "image", THUMB_MAX],
    ["services", "examples", THUMB_MAX],
    ["adoptables", "images", THUMB_MAX],
    ["profiles", "banner", THUMB_MAX],
    ["profiles", "avatar", AVATAR_THUMB],
  ] as const) {
    console.log(`${table}.${column}`);
    total += await backfill(table, column, size);
  }
  console.log(apply ? `\nMade ${total} thumbs.` : `\n${total} pictures would get a thumb. Run again with --apply to make them.`);
} else if (args[0] === "backup") {
  const target = backupTargetFromEnv();
  if (!target) throw new Error("Set BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID and BACKUP_S3_SECRET_ACCESS_KEY first.");
  console.log(args.includes("--sweep") ? await sweepDeleted(supabase, target) : await copyNewFiles(supabase, target));
} else {
  console.log("Usage:\n  npm run images -- thumbs [--apply] [--local]\n  npm run images -- backup [--sweep] [--local]");
  process.exitCode = 1;
}
