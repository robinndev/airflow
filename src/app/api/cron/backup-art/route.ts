import { copyNewFiles, sweepDeleted } from "@/lib/backup/art";
import { backupTargetFromEnv } from "@/lib/backup/s3";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Vercel Cron (vercel.json): copies new art to the backup bucket every hour,
 * and once a day (`?sweep=1`) lets go of files deleted 30+ days ago. Does
 * nothing until the BACKUP_S3_* variables are set. See src/lib/backup/art.ts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const target = backupTargetFromEnv();
  if (!target) return Response.json({ skipped: "No backup bucket yet (BACKUP_S3_* variables)." });

  const supabase = createSupabaseAdmin();
  const sweep = new URL(request.url).searchParams.has("sweep");
  return Response.json(sweep ? await sweepDeleted(supabase, target) : await copyNewFiles(supabase, target));
}
