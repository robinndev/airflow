import type { SupabaseClient } from "@supabase/supabase-js";
import { s3, type BackupTarget } from "./s3.ts";

/*
 * The art backup (roadmap: "Not losing them"). Supabase's daily backups
 * cover the database only, so every file in `art` and `originals` is copied
 * to a bucket at another company (Cloudflare R2), keyed `<bucket>/<path>`.
 * That bucket has a 30-day retention lock: nothing, not even us with the
 * key, can delete or overwrite a file there for 30 days.
 *
 * - `copyNewFiles()` (hourly): files created since the last run, oldest
 *   first; where it got to is kept in `_state/cursor.json` in the backup.
 * - `sweepDeleted()` (daily): a file gone from Supabase for 30 days goes
 *   from the backup too, so a deleted account is really gone (say so in the
 *   privacy policy). `_state/missing.json` remembers when each was missed.
 *
 * Plain TS with relative imports: the cron route and `npm run images` share it.
 */

const BUCKETS = ["art", "originals"] as const;
const KEEP_DELETED_DAYS = 30;
const CURSOR = "_state/cursor.json";
const MISSING = "_state/missing.json";

type Cursor = { createdAt: string; bucket: string; name: string };
type Row = { bucket_id: string; name: string; created_at: string; mimetype: string | null };

/** Runs `work` over `items`, `limit` at a time. */
async function inBatches<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += limit) await Promise.all(items.slice(i, i + limit).map(work));
}

export async function copyNewFiles(supabase: SupabaseClient, target: BackupTarget, { budgetMs = 240_000 } = {}) {
  const store = s3(target);
  const started = Date.now();
  let cursor = (await store.getJson<Cursor>(CURSOR)) ?? { createdAt: "1970-01-01T00:00:00Z", bucket: "", name: "" };
  let copied = 0;
  const failed: string[] = [];

  while (Date.now() - started < budgetMs) {
    const { data, error } = await supabase.rpc("backup_objects_after", {
      after_time: cursor.createdAt,
      after_bucket: cursor.bucket,
      after_name: cursor.name,
      max_rows: 200,
    });
    if (error) throw new Error(`Listing new files failed: ${error.message}`);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;

    await inBatches(rows, 8, async (row) => {
      const { data: file, error: downloadError } = await supabase.storage.from(row.bucket_id).download(row.name);
      if (downloadError || !file) {
        failed.push(`${row.bucket_id}/${row.name}`); // Deleted since it was listed, most likely.
        return;
      }
      await store.put(`${row.bucket_id}/${row.name}`, file, row.mimetype ?? file.type);
      copied++;
    });
    const last = rows[rows.length - 1];
    cursor = { createdAt: last.created_at, bucket: last.bucket_id, name: last.name };
    await store.put(CURSOR, JSON.stringify(cursor), "application/json");
  }
  return { copied, failed, upTo: cursor.createdAt };
}

export async function sweepDeleted(supabase: SupabaseClient, target: BackupTarget, now = new Date()) {
  const store = s3(target);
  const missing = (await store.getJson<Record<string, string>>(MISSING)) ?? {};
  const seen = new Set<string>();
  let removed = 0;

  for (const bucket of BUCKETS) {
    for await (const keys of store.list(`${bucket}/`)) {
      const names = keys.map((key) => key.slice(bucket.length + 1));
      const { data, error } = await supabase.rpc("backup_objects_existing", { bucket, names });
      if (error) throw new Error(`Checking files failed: ${error.message}`);
      const existing = new Set((data ?? []) as string[]);
      for (const name of names) {
        if (existing.has(name)) continue;
        const key = `${bucket}/${name}`;
        seen.add(key);
        missing[key] ??= now.toISOString();
        const days = (now.getTime() - Date.parse(missing[key])) / 86_400_000;
        if (days >= KEEP_DELETED_DAYS && (await store.delete(key))) {
          delete missing[key];
          removed++;
        }
      }
    }
  }
  // A file that came back (or was never really gone) stops counting.
  for (const key of Object.keys(missing)) if (!seen.has(key)) delete missing[key];
  await store.put(MISSING, JSON.stringify(missing), "application/json");
  return { removed, waiting: Object.keys(missing).length };
}
