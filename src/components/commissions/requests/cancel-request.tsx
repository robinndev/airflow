"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { cancelRequest } from "@/app/(site)/request-actions";
import { Tape } from "@/components/explore/doodles";
import { CANCEL_CHOICES, CANCEL_NOTE_MAX, CANCEL_REASONS, type CancelReason } from "@/lib/commissions/cancel";

/**
 * Takes back a real request the artist hasn't answered, or declines their
 * quote (the slot goes back to the service). It asks why first, and the
 * artist sees the answer: no silent cancels, no free bait requests.
 */
export function CancelRequestButton({ id, artist, quote = false }: { id: string; artist: string; quote?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Remounts the form each time it opens, so it starts blank.
  const [round, setRound] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRound((r) => r + 1);
          ref.current?.showModal();
        }}
        className="text-sm font-semibold text-paper-muted underline-offset-4 hover:text-on-paper hover:underline"
      >
        {quote ? "Decline the quote" : "Take it back"}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`cancel-${id}`}
        onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-scrim/45 backdrop:backdrop-blur-[2px] open:animate-rise"
      >
        <CancelForm key={round} id={id} artist={artist} quote={quote} close={() => ref.current?.close()} />
      </dialog>
    </>
  );
}

function CancelForm({ id, artist, quote, close }: { id: string; artist: string; quote: boolean; close: () => void }) {
  const router = useRouter();
  const field = useId();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const noteRequired = reason === "other";

  function submit() {
    if (!reason) return setError("Pick a reason first.");
    start(async () => {
      const result = await cancelRequest(id, reason, note);
      if (!result.ok) return setError(result.error);
      close();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grain relative rounded-[6px] bg-paper px-6 pt-8 pb-6 text-on-paper shadow-lift sm:px-7"
    >
      <Tape tone="lilac" className="-top-3 left-1/2 -translate-x-1/2 -rotate-2" />
      <p className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">
        {quote ? `Say no to ${artist}'s quote` : "Withdraw your request"}
      </p>
      <h2 id={`cancel-${id}`} className="mt-1.5 font-display text-xl leading-tight font-extrabold text-balance">
        {quote ? "Why are you declining this quote?" : "Why are you cancelling this commission request?"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        {artist} will see your answer. It helps them plan their slots. Nothing is charged.
      </p>

      <fieldset className="mt-5">
        <legend className="sr-only">Reason</legend>
        <ul className="grid gap-0.5">
          {CANCEL_REASONS.map((value) => {
            const on = reason === value;
            return (
              <li key={value}>
                <label
                  className={`-mx-2 flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 text-[0.9375rem] transition-colors hover:bg-on-paper/5 has-focus-visible:outline-2 has-focus-visible:outline-ocean ${
                    on ? "bg-on-paper/5 font-semibold" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={on}
                    onChange={() => {
                      setReason(value);
                      setError(null);
                    }}
                    className="sr-only"
                  />
                  <PenDot on={on} />
                  {CANCEL_CHOICES[value][quote ? "quote" : "request"]}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label htmlFor={field} className="mt-4 block text-sm font-semibold">
        {noteRequired ? `Tell ${artist} why` : `A note for ${artist}`}{" "}
        {!noteRequired && <span className="font-normal text-paper-muted">(optional)</span>}
      </label>
      <textarea
        id={field}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        required={noteRequired}
        maxLength={CANCEL_NOTE_MAX}
        rows={3}
        placeholder={quote ? "e.g. I'm saving up, I'd love to ask again next month." : "e.g. My OC's design changed, I'll send a new request."}
        className="dot-paper mt-2 w-full resize-y rounded-input border border-on-paper/15 px-3.5 py-2.5 text-sm text-on-paper placeholder:text-paper-muted focus:border-ocean focus:outline-none"
      />

      <p role="alert" className="mt-2 min-h-5 text-sm text-danger">
        {error}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="inline-flex h-10 items-center rounded-action border border-on-paper/15 px-4 text-sm font-semibold transition-colors hover:bg-on-paper/5"
        >
          {quote ? "Keep the quote" : "Keep my request"}
        </button>
        <button
          type="submit"
          disabled={pending || !reason}
          className="inline-flex h-10 items-center gap-2 rounded-action bg-danger px-4 text-sm font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:opacity-50"
        >
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {quote ? "Decline the quote" : "Withdraw request"}
        </button>
      </div>
    </form>
  );
}

/** A pen circle; picked, it's filled with a blot of ink. */
function PenDot({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="size-6 shrink-0">
      <path
        d="M12.6 3c5 .2 8.6 3.9 8.3 8.9-.3 4.9-4.2 8.4-9 8.2C7.1 19.9 3.5 16 3.8 11.3 4.1 6.4 7.8 2.9 13.6 3.4"
        className={on ? "stroke-on-paper" : "stroke-paper-muted/60"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 7.6c2.6-.1 4.5 1.8 4.4 4.3-.1 2.4-2 4.2-4.5 4.1-2.4-.1-4.1-2-4-4.4.1-2.3 1.8-4 4.1-4Z"
        className={`fill-on-paper transition-[opacity,scale] duration-200 [transform-origin:center] ${on ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
      />
    </svg>
  );
}
