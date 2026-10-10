import type { Post, PostAuthor } from "@/lib/profile/types";
import type { CommentsTarget, RepostTarget } from "./events";

/** First line of a post, short enough for a panel header. */
function excerpt(body: string, max = 90) {
  const line = body.trim().split(/\r?\n/)[0];
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export function commentsTarget(post: Post, author: PostAuthor): CommentsTarget {
  return { postId: post.id, authorName: author.displayName.split(" ")[0], excerpt: excerpt(post.body) };
}

/** Reposting a repost pins its original (the server does the same). */
export function repostTarget(post: Post, author: PostAuthor): RepostTarget {
  const original = post.quoted ?? { post, author };
  return {
    postId: original.post.id,
    author: { handle: original.author.handle, displayName: original.author.displayName },
    image: original.post.media[0],
    text: excerpt(original.post.body, 240),
  };
}
