"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import { prepareImage, type PreparedImage } from "@/lib/images/prepare";
import { MAX_MESSAGE_IMAGES, MAX_MESSAGE_LENGTH } from "@/lib/messages/types";
import { MESSAGE_IMAGE_SIZE } from "@/lib/messages/upload";
import { readDraft, saveDraft } from "./store";

export type Attachment = { id: string; image: PreparedImage };

/** Ways to start, shown on an empty conversation. The [bracketed] part is selected, ready to overwrite. */
function icebreakers(first: string, takingWork: boolean, firstService?: string) {
  return [
    takingWork && {
      label: "Ask about a commission",
      text: `Hi ${first}! I'd love to commission you. I'm thinking of [describe your idea]. Would you take it on?`,
    },
    takingWork &&
      firstService && {
        label: "Is a slot open?",
        text: `Hi ${first}! Do you have a slot open for a ${firstService.toLowerCase()}?`,
      },
    {
      label: "Say you love their work",
      text: `Hi ${first}! I just wanted to say I love your work, especially [the piece you loved].`,
    },
  ].filter((idea): idea is { label: string; text: string } => Boolean(idea));
}

/**
 * Writing a message: words, up to four pictures (checked for AI generators
 * like every upload), Enter to send. Drafts survive closing the window.
 */
export function Composer({
  handle,
  first,
  empty,
  takingWork,
  firstService,
  onSend,
  onTyping,
}: {
  handle: string;
  first: string;
  /** No messages yet: offer ways to start. */
  empty: boolean;
  takingWork: boolean;
  firstService?: string;
  onSend: (body: string, attachments: Attachment[]) => void;
  onTyping: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(() => readDraft(handle));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [preparing, setPreparing] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [aiError, setAiError] = useState<AiImageError | null>(null);

  // Grow with the text, up to a few lines.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [body]);

  useEffect(() => saveDraft(handle, body), [handle, body]);

  // Previews are object URLs: let them go when the composer does.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.image.previewUrl)), []);

  async function attach(files: FileList | null) {
    if (!files?.length) return;
    setProblem(null);
    const room = MAX_MESSAGE_IMAGES - attachments.length;
    const picked = [...files].slice(0, Math.max(0, room));
    if (files.length > room) setProblem(`Up to ${MAX_MESSAGE_IMAGES} pictures per message.`);
    setPreparing((n) => n + picked.length);
    for (const file of picked) {
      try {
        const image = await prepareImage(file, MESSAGE_IMAGE_SIZE, { allowGif: true });
        setAttachments((list) => [...list, { id: crypto.randomUUID(), image }]);
      } catch (error) {
        if (error instanceof AiImageError) setAiError(error);
        else setProblem(error instanceof Error ? error.message : "Couldn't read that picture.");
      } finally {
        setPreparing((n) => n - 1);
      }
    }
  }

  function remove(id: string) {
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.image.previewUrl);
      return list.filter((a) => a.id !== id);
    });
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if ((!text && attachments.length === 0) || preparing > 0) return;
    if (text.length > MAX_MESSAGE_LENGTH) return setProblem(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`);
    onSend(text, attachments);
    setBody("");
    setAttachments([]);
    setProblem(null);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function start(text: string) {
    setBody(text);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const from = text.indexOf("[");
      const to = text.indexOf("]", from);
      if (from >= 0 && to > from) input.setSelectionRange(from, to + 1);
      else input.setSelectionRange(text.length, text.length);
    });
  }

  const ideas = empty && !body ? icebreakers(first, takingWork, firstService) : [];
  const canSend = (body.trim().length > 0 || attachments.length > 0) && preparing === 0;
  const over = body.length > MAX_MESSAGE_LENGTH - 200;

  return (
    <form onSubmit={submit} className="border-t border-dashed border-border bg-surface/85 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-5">
      {ideas.length > 0 && (
        <div className="mx-auto mb-2.5 flex max-w-2xl flex-wrap gap-2">
          {ideas.map((idea, i) => (
            <button
              key={idea.label}
              type="button"
              onClick={() => start(idea.text)}
              className={`rounded-[4px] bg-paper px-2.5 py-1 font-hand text-[1.0625rem] leading-tight font-semibold text-on-paper shadow-soft ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:rotate-0 ${
                ["-rotate-1", "rotate-1", "-rotate-[0.5deg]"][i % 3]
              }`}
            >
              {idea.label}
            </button>
          ))}
        </div>
      )}

      {(attachments.length > 0 || preparing > 0) && (
        <ul className="mx-auto mb-2.5 flex max-w-2xl flex-wrap gap-2.5">
          {attachments.map((a, i) => (
            <li
              key={a.id}
              className={`relative rounded-[3px] bg-paper p-1 shadow-soft ring-1 ring-black/5 ${i % 2 ? "rotate-2" : "-rotate-2"}`}
            >
              <Image
                src={a.image.previewUrl}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="size-16 rounded-[2px] bg-ice object-cover"
              />
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label="Remove picture"
                className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-on-ink shadow-soft"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
          {preparing > 0 && (
            <li className="grid size-[4.5rem] place-items-center rounded-[3px] bg-ice text-muted" aria-label="Preparing picture">
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            </li>
          )}
        </ul>
      )}

      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[20px] border border-border bg-surface p-1.5 shadow-soft transition-[border-color,box-shadow] focus-within:border-ocean focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ocean)_14%,transparent)]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={attachments.length >= MAX_MESSAGE_IMAGES}
          aria-label="Attach pictures"
          title="Attach pictures"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink disabled:opacity-40"
        >
          <ImagePlus aria-hidden className="size-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(event) => {
            void attach(event.target.files);
            event.target.value = "";
          }}
        />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message to {first}</span>
          <textarea
            ref={inputRef}
            rows={1}
            value={body}
            maxLength={MAX_MESSAGE_LENGTH + 200}
            onChange={(event) => {
              setBody(event.target.value);
              onTyping();
            }}
            onKeyDown={onKeyDown}
            placeholder={`Write to ${first}…`}
            className="block max-h-40 w-full resize-none bg-transparent px-1 py-2 text-[0.9375rem] leading-snug text-ink outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ocean px-3 text-sm font-semibold text-white transition-[filter,opacity] hover:brightness-95 disabled:opacity-40 sm:px-4"
        >
          <SendHorizontal aria-hidden className="size-4" />
          <span className="hidden sm:inline">Send</span>
          <span className="sr-only sm:hidden">Send</span>
        </button>
      </div>

      <div className="mx-auto mt-1.5 flex max-w-2xl items-center justify-between gap-3 px-1 text-[0.6875rem] text-muted">
        <p role="status" className={problem ? "text-danger" : "hidden sm:block"}>
          {problem ?? "Enter to send · Shift + Enter for a new line"}
        </p>
        {over && (
          <p className={body.length > MAX_MESSAGE_LENGTH ? "text-danger" : ""}>
            {body.length} / {MAX_MESSAGE_LENGTH}
          </p>
        )}
      </div>

      <AiImageDialog error={aiError} onClose={() => setAiError(null)} onPickAnother={() => fileRef.current?.click()} />
    </form>
  );
}
