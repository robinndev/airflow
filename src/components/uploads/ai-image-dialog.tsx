"use client";

import { CircleCheck, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { requestAiReview } from "@/app/(site)/ai-review-actions";
import { HumanSeal } from "@/components/explore/human-seal";
import { buttonClasses } from "@/components/ui/button";
import type { AiImageError } from "@/lib/ai-check/browser";

type Step = "refused" | "asking" | "sent";

/**
 * Explains why an upload was turned away by the AI check, and lets the artist
 * ask for a review ("I made this myself"). Works for any upload: catch the
 * AiImageError from `assertMadeByHumans()` / `prepareImage()` and pass it in.
 *
 * Native <dialog> (focus trap, Esc, top layer). No <form> inside, so it can
 * sit within a composer's form.
 */
export function AiImageDialog({
  error,
  onClose,
  onPickAnother,
}: {
  error: AiImageError | null;
  onClose: () => void;
  /** Reopen the file picker. Without it, the main button just closes. */
  onPickAnother?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [step, setStep] = useState<Step>("refused");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (error && !dialog?.open) dialog?.showModal();
  }, [error]);

  function close() {
    dialogRef.current?.close();
  }

  function send() {
    if (!error) return;
    setProblem(null);
    startTransition(async () => {
      const result = await requestAiReview({
        fileName: error.fileName,
        fileType: error.fileType,
        fileSize: error.fileSize,
        ...error.signature,
        note,
      });
      if (result.ok) setStep("sent");
      else setProblem(result.error);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        setStep("refused");
        setNote("");
        setProblem(null);
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-panel bg-surface p-0 text-ink shadow-lift outline-none transition-[opacity,scale] duration-200 backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] starting:open:scale-95 starting:open:opacity-0"
    >
      {error && (
        <div className="relative">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-muted shadow-soft backdrop-blur-sm transition-colors hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>

          <div className="grain grid place-items-center bg-ice pt-8 pb-5">
            {step === "sent" ? (
              <span className="grid size-24 place-items-center rounded-full bg-surface text-ocean shadow-soft">
                <CircleCheck aria-hidden className="size-10" strokeWidth={1.75} />
              </span>
            ) : (
              <HumanSeal id={`${titleId}-seal`} className="size-28 -rotate-6" />
            )}
          </div>

          <div className="px-6 pt-5 pb-6 sm:px-8">
            {step === "refused" && (
              <>
                <h2 id={titleId} className="text-center font-display text-xl font-extrabold tracking-tight text-balance">
                  This image says it was made with AI
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-pretty text-muted">
                  The file <span className="font-semibold break-all text-ink">“{error.fileName}”</span> says it was made
                  with <span className="font-semibold text-ink">{error.signature.generator}</span>. Artiflow is made by
                  humans, so AI-generated art can&apos;t be posted here, not even in part.
                </p>
                <details className="group mt-4 rounded-input border border-border bg-canvas px-3.5 py-2.5 text-xs text-muted">
                  <summary className="cursor-pointer font-semibold text-ink marker:text-muted">What we found</summary>
                  <p className="mt-2">{error.signature.evidence}</p>
                  {error.signature.excerpt && (
                    <p className="mt-1.5 line-clamp-3 font-mono text-[0.6875rem] break-all">{error.signature.excerpt}</p>
                  )}
                </details>

                <div className="mt-6 grid gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      close();
                      onPickAnother?.();
                    }}
                    className={buttonClasses({ size: "lg", className: "w-full" })}
                  >
                    {onPickAnother ? "Pick another image" : "OK"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("asking")}
                    className={buttonClasses({ variant: "ghost", size: "lg", className: "w-full" })}
                  >
                    I made this myself
                  </button>
                </div>
              </>
            )}

            {step === "asking" && (
              <>
                <h2 id={titleId} className="text-center font-display text-xl font-extrabold tracking-tight text-balance">
                  Ask for a review
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-pretty text-muted">
                  Someone from the team will look at what we found and reply by email. Until then, this image
                  can&apos;t be posted.
                </p>
                <label className="mt-5 block text-sm font-semibold" htmlFor={`${titleId}-note`}>
                  How did you make it? <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id={`${titleId}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  autoFocus
                  placeholder="The program you drew it in, how you exported it, anything that helps."
                  className="mt-2 w-full resize-none rounded-input border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-ocean"
                />
                <p role="alert" className="mt-1 min-h-5 text-xs text-danger">
                  {problem}
                </p>

                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={send}
                    disabled={pending}
                    className={buttonClasses({ size: "lg", className: "w-full" })}
                  >
                    {pending && <LoaderCircle aria-hidden className="animate-spin" />}
                    {pending ? "Sending…" : "Send for review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("refused")}
                    disabled={pending}
                    className={buttonClasses({ variant: "ghost", size: "lg", className: "w-full" })}
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {step === "sent" && (
              <>
                <h2 id={titleId} className="text-center font-display text-xl font-extrabold tracking-tight text-balance">
                  Thanks for telling us
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-pretty text-muted">
                  Your review request is in. Someone from the team will reply by email.
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={close}
                  className={buttonClasses({ size: "lg", className: "mt-6 w-full" })}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
