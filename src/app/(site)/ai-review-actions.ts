"use server";

import { z } from "zod";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

export type AiReviewResult = { ok: true } | { ok: false; error: string };

const requestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().max(100),
  fileSize: z.number().int().nonnegative(),
  generator: z.string().min(1).max(100),
  evidence: z.string().min(1).max(300),
  excerpt: z.string().max(300),
  note: z.string().trim().max(1000, "Keep your note under 1,000 characters."),
});

export type AiReviewRequest = z.input<typeof requestSchema>;

/**
 * "I made this myself": the artist disputes an upload the AI check turned
 * away. The request goes to the team's queue (`ai_review_requests`); the
 * file itself isn't kept.
 */
export async function requestAiReview(input: AiReviewRequest): Promise<AiReviewResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Your session expired. Sign in again to ask for a review." };

  const { fileName, fileType, fileSize, generator, evidence, excerpt, note } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("ai_review_requests").insert({
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
    generator,
    evidence,
    excerpt,
    note,
  });
  if (error) {
    return {
      ok: false,
      error: /too many review requests/i.test(error.message)
        ? "You've asked for a lot of reviews today. Try again tomorrow."
        : "Couldn't send that. Try again in a moment.",
    };
  }
  return { ok: true };
}
