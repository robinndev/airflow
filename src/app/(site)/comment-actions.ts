"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fetchPostInfo, fetchThreads, postRef } from "@/lib/profile/conversation";
import { FEED_TAG, getProfile, postsTag } from "@/lib/profile/queries";
import type { CommentThread, PostAuthor, PostComment } from "@/lib/profile/types";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ThreadView = {
  threads: CommentThread[];
  /** Null for visitors: they read, and get a sign-in prompt instead of the box. */
  viewer: PostAuthor | null;
  /** The post's author can remove any comment on their (real) post. */
  viewerModerates: boolean;
};

export type CommentResult = { ok: true; comment: PostComment } | { ok: false; error: string };

const MAX_COMMENT_LENGTH = 1000;

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(MAX_COMMENT_LENGTH, `Comments can be up to ${MAX_COMMENT_LENGTH} characters.`),
  parentId: z.uuid().nullable(),
});

async function viewerAuthor() {
  const viewer = await getViewer();
  const profile = viewer && (await getProfile(viewer.handle));
  if (!viewer || !profile) return null;
  const author: PostAuthor = {
    handle: profile.handle,
    displayName: profile.displayName,
    avatar: profile.avatar,
    plan: profile.plan,
  };
  return { id: viewer.id, author };
}

/** Comment counts show on the feed and on the author's profile. */
function refreshCounts(authorHandle: string) {
  updateTag(FEED_TAG);
  updateTag(postsTag(authorHandle));
}

/** The whole conversation on a post, read fresh when the comments panel opens. */
export async function loadComments(postId: string): Promise<ThreadView | null> {
  if (!postRef(postId)) return null;
  const [threads, me, info] = await Promise.all([fetchThreads(postId), viewerAuthor(), fetchPostInfo(postId)]);
  return {
    threads,
    viewer: me?.author ?? null,
    viewerModerates: Boolean(me && info && info.authorHandle === me.author.handle && !postId.startsWith("pst_")),
  };
}

export async function addComment(postId: string, body: string, parentId: string | null): Promise<CommentResult> {
  const me = await viewerAuthor();
  if (!me) return { ok: false, error: "Sign in to comment." };
  const ref = postRef(postId);
  const info = ref && (await fetchPostInfo(postId));
  if (!ref || !info) return { ok: false, error: "That post isn't there anymore." };
  const parsed = commentSchema.safeParse({ body, parentId });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("comments")
    .insert({ ...ref, parent_id: parsed.data.parentId, author_id: me.id, body: parsed.data.body })
    .select("id, created_at")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't post your comment. Try again in a moment." };

  refreshCounts(info.authorHandle);
  return {
    ok: true,
    comment: {
      id: data.id,
      author: me.author,
      body: parsed.data.body,
      createdAt: data.created_at,
      parentId: parsed.data.parentId,
    },
  };
}

export async function deleteComment(commentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await viewerAuthor();
  if (!me) return { ok: false, error: "Sign in to manage comments." };
  if (!z.uuid().safeParse(commentId).success) return { ok: false, error: "That comment isn't there anymore." };

  const supabase = await createSupabaseServer();
  // Row level security decides: your own comments, or any comment on your post.
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .select("post_id, demo_post_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't delete that comment." };

  const info = await fetchPostInfo((data.post_id ?? data.demo_post_id)!);
  if (info) refreshCounts(info.authorHandle);
  return { ok: true };
}

/** The signed-in artist, for dialogs that open on static pages (repost). */
export async function currentArtist(): Promise<PostAuthor | null> {
  return (await viewerAuthor())?.author ?? null;
}
