"use client";

import Link from "next/link";
import { CornerDownRight, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addComment, deleteComment, loadComments, type ThreadView } from "@/app/(site)/comment-actions";
import { HandNote } from "@/components/explore/doodles";
import { Avatar } from "@/components/ui/avatar";
import { formatShortDate } from "@/lib/format";
import type { CommentThread, PostComment } from "@/lib/profile/types";
import { OPEN_COMMENTS_EVENT, type CommentsTarget } from "./events";

const MAX_LENGTH = 1000;

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return formatShortDate(iso);
}

type Reply = { threadId: string; handle: string };

/**
 * The conversation on a post: a drawer on wide screens, a bottom sheet on
 * phones. One per page; any comments button opens it (see events.ts).
 * Comments are read fresh each time it opens.
 */
export function CommentsPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [target, setTarget] = useState<CommentsTarget | null>(null);
  const [view, setView] = useState<ThreadView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function onOpen(event: Event) {
      const next = (event as CustomEvent<CommentsTarget>).detail;
      setTarget(next);
      setView(null);
      setLoadError(false);
      setBody("");
      setReplyTo(null);
      setError(null);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      const loaded = await loadComments(next.postId).catch(() => null);
      if (loaded) setView(loaded);
      else setLoadError(true);
    }
    window.addEventListener(OPEN_COMMENTS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COMMENTS_EVENT, onOpen);
  }, []);

  function startReply(thread: CommentThread, to: PostComment) {
    setReplyTo({ threadId: thread.id, handle: to.author.handle });
    // Replying to a reply: mention who you're answering, the thread stays flat.
    if (to.id !== thread.id && !body.startsWith(`@${to.author.handle}`)) setBody(`@${to.author.handle} ${body}`);
    inputRef.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    const result = await addComment(target.postId, body, replyTo?.threadId ?? null);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { comment } = result;
    setView((current) => {
      if (!current) return current;
      const threads = comment.parentId
        ? current.threads.map((t) => (t.id === comment.parentId ? { ...t, replies: [...t.replies, comment] } : t))
        : [...current.threads, { ...comment, replies: [] }];
      return { ...current, threads };
    });
    setBody("");
    setReplyTo(null);
  }

  async function remove(comment: PostComment) {
    const result = await deleteComment(comment.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setView((current) =>
      current && {
        ...current,
        threads: current.threads
          .filter((t) => t.id !== comment.id)
          .map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== comment.id) })),
      },
    );
  }

  const count = view ? view.threads.reduce((n, t) => n + 1 + t.replies.length, 0) : null;
  const canDelete = (comment: PostComment) =>
    !comment.seed && Boolean(view?.viewer && (comment.author.handle === view.viewer.handle || view.viewerModerates));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="comments-title"
      onClose={() => setTarget(null)}
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      className="m-0 mt-auto h-[88dvh] max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim/40 backdrop:backdrop-blur-[2px] open:animate-rise sm:mt-0 sm:ml-auto sm:h-dvh sm:w-[27rem]"
    >
      <div className="grain flex h-full flex-col overflow-hidden rounded-t-panel border border-border bg-surface shadow-lift sm:rounded-none sm:rounded-l-panel">
        <header className="flex items-start gap-3 border-b border-dashed border-border px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id="comments-title" className="text-[0.625rem] font-bold tracking-[0.18em] text-muted uppercase">
              Conversation{count !== null && ` · ${count}`}
            </h2>
            {target && (
              <p className="mt-1.5 line-clamp-2 font-display text-[1.0625rem] leading-snug font-bold text-ink">
                <span className="text-muted">On {target.authorName}&apos;s </span>
                {target.excerpt ? `“${target.excerpt}”` : "repost"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close comments"
            className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {loadError ? (
            <p className="py-10 text-center text-sm text-muted">Couldn&apos;t load the comments. Close and try again.</p>
          ) : !view ? (
            <div aria-busy aria-label="Loading comments" className="grid gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-8 skeleton rounded-full bg-ice" />
                  <div className="flex-1">
                    <div className="h-3 w-28 skeleton rounded-input bg-ice" />
                    <div className="mt-2 h-3 w-4/5 skeleton rounded-input bg-ice" />
                  </div>
                </div>
              ))}
            </div>
          ) : view.threads.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <HandNote className="-rotate-2 text-[1.75rem]">no notes yet…</HandNote>
              <p className="mt-2 text-sm text-muted">Be the first to say something about this piece.</p>
            </div>
          ) : (
            <ol className="grid gap-5">
              {view.threads.map((thread) => (
                <li key={thread.id}>
                  <Comment
                    comment={thread}
                    canReply={Boolean(view.viewer) && !thread.seed}
                    canDelete={canDelete(thread)}
                    onReply={() => startReply(thread, thread)}
                    onDelete={() => remove(thread)}
                  />
                  {thread.replies.length > 0 && (
                    <ol className="mt-3 ml-4 grid gap-3.5 border-l-2 border-border pl-4">
                      {thread.replies.map((reply) => (
                        <li key={reply.id}>
                          <Comment
                            comment={reply}
                            small
                            canReply={Boolean(view.viewer)}
                            canDelete={canDelete(reply)}
                            onReply={() => startReply(thread, reply)}
                            onDelete={() => remove(reply)}
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="border-t border-border bg-surface/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {view && !view.viewer ? (
            <p className="py-2 text-center text-sm text-muted">
              <Link href="/sign-in" className="font-semibold text-ocean-ink hover:underline">
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          ) : (
            <form onSubmit={submit}>
              {replyTo && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <CornerDownRight aria-hidden className="size-3.5" />
                  Replying to @{replyTo.handle}
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                    className="ml-0.5 grid size-5 place-items-center rounded-full hover:bg-ice hover:text-ink"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </p>
              )}
              <div className="flex items-end gap-2.5">
                {view?.viewer && <Avatar image={view.viewer.avatar} size={32} className="mb-1 size-8" />}
                <label htmlFor="comment-body" className="sr-only">
                  {replyTo ? `Reply to @${replyTo.handle}` : "Add a comment"}
                </label>
                <textarea
                  id="comment-body"
                  ref={inputRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                  }}
                  rows={1}
                  maxLength={MAX_LENGTH}
                  disabled={!view}
                  placeholder={replyTo ? `Reply to @${replyTo.handle}…` : "Add a comment…"}
                  className="field-sizing-content block max-h-36 min-h-10 flex-1 resize-none rounded-[20px] border border-border bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/80 focus:border-ocean/50"
                />
                <button
                  type="submit"
                  disabled={!body.trim() || sending || !view}
                  aria-label={replyTo ? "Send reply" : "Send comment"}
                  className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-ocean text-white transition hover:brightness-95 disabled:opacity-40"
                >
                  {sending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
                </button>
              </div>
              <p role="status" aria-live="polite" className="mt-1.5 min-h-4 text-xs text-danger">
                {error}
              </p>
            </form>
          )}
        </footer>
      </div>
    </dialog>
  );
}

function Comment({
  comment,
  small = false,
  canReply,
  canDelete,
  onReply,
  onDelete,
}: {
  comment: PostComment;
  small?: boolean;
  canReply: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = "text-xs font-semibold text-muted transition-colors hover:text-ink";

  return (
    <article className="flex gap-3">
      <Link href={`/${comment.author.handle}`} className="shrink-0">
        <Avatar image={comment.author.avatar} size={small ? 28 : 32} className={small ? "size-7" : "size-8"} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem]">
          <Link href={`/${comment.author.handle}`} className="font-bold text-ink hover:underline">
            {comment.author.displayName}
          </Link>
          <span className="text-muted">@{comment.author.handle}</span>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <time dateTime={comment.createdAt} className="text-muted">
            {ago(comment.createdAt)}
          </time>
        </p>
        <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-pretty break-words whitespace-pre-line text-ink">
          {comment.body}
        </p>
        {(canReply || canDelete) && (
          <p className="mt-1 flex items-center gap-3">
            {canReply && (
              <button type="button" onClick={onReply} className={action}>
                Reply
              </button>
            )}
            {canDelete &&
              (confirming ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 font-semibold text-danger hover:underline">
                    <Trash2 aria-hidden className="size-3" />
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={action}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className={action}>
                  Delete
                </button>
              ))}
          </p>
        )}
      </div>
    </article>
  );
}
