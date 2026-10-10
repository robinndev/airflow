import { createSupabasePublic } from "@/lib/supabase/server";
import { ACCOUNT_COLUMNS, configured, toPostAuthor, type AccountRow } from "./accounts";
import { defaultArt } from "./default-art";
import { db } from "./mock-db";
import type { CommentThread, Post, PostAuthor, PostComment } from "./types";

/*
 * Comments (with one level of replies) and repost counts. Real posts are
 * referenced by uuid, demo posts (mock-db.ts) by their `pst_` id — see the
 * `comments` / `posts.quote_*` columns in supabase/migrations. Reads are
 * public (row level security allows it), so they work inside `"use cache"`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_ID = /^pst_[0-9]+$/;

export const isRealPostId = (id: string) => UUID.test(id);
export const isDemoPostId = (id: string) => DEMO_ID.test(id) && db.posts.some((p) => p.id === id);

/** The column a comment or repost uses to point at this post. */
export function postRef(id: string): { post_id: string } | { demo_post_id: string } | null {
  if (isRealPostId(id)) return { post_id: id };
  if (isDemoPostId(id)) return { demo_post_id: id };
  return null;
}

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  post_id: string | null;
  demo_post_id: string | null;
  author: AccountRow;
};

const COMMENT_COLUMNS = `id, body, created_at, parent_id, post_id, demo_post_id, author:profiles!inner(${ACCOUNT_COLUMNS})`;

function toComment(row: CommentRow): PostComment {
  return {
    id: row.id,
    author: toPostAuthor(row.author),
    body: row.body,
    createdAt: row.created_at,
    parentId: row.parent_id,
  };
}

/** A demo post's made-up first comment, so its thread doesn't start empty. */
function seedComment(post: Post): PostComment | undefined {
  if (!post.topComment) return undefined;
  const { author: handle, text } = post.topComment;
  const profile = db.profiles.find((p) => p.handle === handle);
  const author: PostAuthor = profile
    ? { handle, displayName: profile.displayName, avatar: profile.avatar, plan: profile.plan }
    : { handle, displayName: handle, avatar: defaultArt(handle, handle).avatar, plan: "free" };
  return { id: `${post.id}-seed`, author, body: text, createdAt: post.createdAt, parentId: null, seed: true };
}

/** PostgREST filter matching rows that point at any of these posts. */
function refFilter(posts: Post[], realColumn: string, demoColumn: string) {
  const real = posts.map((p) => p.id).filter(isRealPostId);
  const demo = posts.map((p) => p.id).filter((id) => DEMO_ID.test(id));
  const parts = [
    real.length && `${realColumn}.in.(${real.join(",")})`,
    demo.length && `${demoColumn}.in.(${demo.join(",")})`,
  ].filter(Boolean);
  return parts.length ? parts.join(",") : null;
}

export type Conversation = { comments: number; latest?: PostComment; reposts: number };

/** Comment counts, newest top-level comment and repost counts for a batch of posts. */
export async function fetchConversations(posts: Post[]): Promise<Map<string, Conversation>> {
  const result = new Map<string, Conversation>(posts.map((p) => [p.id, { comments: 0, reposts: 0 }]));
  // Demo posts reposting demo posts.
  for (const p of db.posts) {
    const target = p.quotePostId && result.get(p.quotePostId);
    if (target) target.reposts++;
  }

  const comments = refFilter(posts, "post_id", "demo_post_id");
  const quotes = refFilter(posts, "quote_post_id", "quote_demo_post_id");
  if (configured() && comments && quotes) {
    const supabase = createSupabasePublic();
    const [all, latest, reposts] = await Promise.all([
      supabase.from("comments").select("post_id, demo_post_id").or(comments).limit(10_000),
      supabase
        .from("comments")
        .select(COMMENT_COLUMNS)
        .or(comments)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(500)
        .returns<CommentRow[]>(),
      supabase.from("posts").select("quote_post_id, quote_demo_post_id").or(quotes).limit(10_000),
    ]);
    if (all.error || latest.error || reposts.error) {
      throw new Error(`Couldn't load comments: ${(all.error ?? latest.error ?? reposts.error)?.message}`);
    }
    for (const row of all.data) result.get((row.post_id ?? row.demo_post_id)!)!.comments++;
    for (const row of latest.data) {
      const entry = result.get((row.post_id ?? row.demo_post_id)!)!;
      entry.latest ??= toComment(row);
    }
    for (const row of reposts.data) {
      const entry = result.get((row.quote_post_id ?? row.quote_demo_post_id)!);
      if (entry) entry.reposts++;
    }
  }

  for (const post of posts) {
    const seed = seedComment(post);
    const entry = result.get(post.id)!;
    if (!seed) continue;
    entry.comments++;
    entry.latest ??= seed;
  }
  return result;
}

/** Every comment on a post, as threads: top-level comments oldest first, each with its replies. */
export async function fetchThreads(postId: string): Promise<CommentThread[]> {
  const ref = postRef(postId);
  if (!ref) return [];
  const demo = db.posts.find((p) => p.id === postId);
  const seed = demo && seedComment(demo);
  const threads: CommentThread[] = seed ? [{ ...seed, replies: [] }] : [];
  if (!configured()) return threads;

  const [column, value] = Object.entries(ref)[0];
  const { data, error } = await createSupabasePublic()
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq(column, value)
    .order("created_at", { ascending: true })
    .limit(1000)
    .returns<CommentRow[]>();
  if (error) throw new Error(`Couldn't load comments: ${error.message}`);

  const byId = new Map<string, CommentThread>();
  for (const row of data) {
    const comment = toComment(row);
    if (comment.parentId) byId.get(comment.parentId)?.replies.push(comment);
    else {
      const thread = { ...comment, replies: [] };
      byId.set(comment.id, thread);
      threads.push(thread);
    }
  }
  return threads;
}

/** Who wrote a post and what it reposts, for demo and real posts alike. */
export async function fetchPostInfo(id: string): Promise<{ authorHandle: string; quotePostId?: string } | null> {
  const demo = db.posts.find((p) => p.id === id);
  if (demo) return { authorHandle: demo.authorHandle, quotePostId: demo.quotePostId };
  if (!isRealPostId(id) || !configured()) return null;
  const { data, error } = await createSupabasePublic()
    .from("posts")
    .select("quote_post_id, quote_demo_post_id, author:profiles!inner(handle)")
    .eq("id", id)
    .maybeSingle<{ quote_post_id: string | null; quote_demo_post_id: string | null; author: { handle: string } }>();
  if (error || !data) return null;
  return { authorHandle: data.author.handle, quotePostId: data.quote_post_id ?? data.quote_demo_post_id ?? undefined };
}
