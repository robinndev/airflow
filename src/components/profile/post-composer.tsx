"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { useActionState, useId, useRef, useState, type ChangeEvent } from "react";
import { createPost, type ActionResult } from "@/app/(site)/[handle]/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { downscaleImage, type DownscaledImage } from "@/lib/images/downscale";
import { POST_KIND_ORDER, POST_KINDS } from "@/lib/profile/post-kinds";
import type { ImageAsset, PostKind } from "@/lib/profile/types";

const MAX_LENGTH = 2000;

type PostComposerProps = {
  handle: string;
  displayName: string;
  avatar: ImageAsset;
  /** "card" on profiles; "inline" sits flush inside a list. */
  variant?: "card" | "inline";
  /** Preselected post type (the home feed's canvas opens straight into one). */
  initialKind?: PostKind;
  /** Called after a post is published (e.g. to close a dialog). */
  onPosted?: () => void;
};

export function PostComposer({
  handle,
  displayName,
  avatar,
  variant = "card",
  initialKind = "finished",
  onPosted,
}: PostComposerProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [image, setImage] = useState<DownscaledImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await createPost(handle, prev, formData);
      if (result.ok) {
        setBody("");
        setImage(null);
        onPosted?.();
      }
      return result;
    },
    null,
  );

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError(null);
    setPreparingImage(true);
    try {
      setImage(await downscaleImage(file, 1600));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Couldn't read that image.");
    } finally {
      setPreparingImage(false);
    }
  }

  const remaining = MAX_LENGTH - body.length;
  const canPost = body.trim().length > 0 && remaining >= 0 && !pending && !preparingImage;
  const error = imageError ?? (state && !state.ok ? state.error : null);

  return (
    <form
      action={formAction}
      aria-label="Create a post"
      className={
        variant === "card"
          ? "rounded-card border border-border bg-surface shadow-soft transition-shadow focus-within:border-sky/70 focus-within:shadow-lift"
          : "border-b border-border bg-surface"
      }
    >
      <div className="flex gap-3 px-5 pt-5">
        <Avatar image={avatar} size={44} className="size-11" />
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-body`} className="sr-only">
            Post text
          </label>
          <textarea
            id={`${id}-body`}
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder={`What's on your canvas, ${displayName.split(" ")[0]}?`}
            className="field-sizing-content block max-h-80 min-h-14 w-full resize-none bg-transparent pt-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-muted/80"
          />
        </div>
      </div>

      {image && (
        <div className="px-5 pt-2 pl-[4.75rem]">
          <div className="relative w-fit overflow-hidden rounded-[12px] border border-border bg-ice">
            <Image
              src={image.dataUrl}
              alt="Selected image preview"
              width={image.width}
              height={image.height}
              unoptimized
              className="max-h-64 w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Remove image"
              className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-scrim/70 text-white transition-colors hover:bg-scrim"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <input type="hidden" name="imageDataUrl" value={image.dataUrl} />
          <input type="hidden" name="imageWidth" value={image.width} />
          <input type="hidden" name="imageHeight" value={image.height} />
        </div>
      )}

      <fieldset className="px-5 pt-3 sm:pl-[4.75rem]">
        <legend className="sr-only">Post type</legend>
        <div className="flex flex-wrap gap-1.5">
          {POST_KIND_ORDER.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="peer sr-only"
              />
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ocean ${
                  kind === value
                    ? `border-transparent ${POST_KINDS[value].className}`
                    : "border-border text-muted hover:text-ink"
                }`}
              >
                {POST_KINDS[value].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex items-center gap-2 border-t border-border px-3 py-3 sm:px-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleImage}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={preparingImage || pending}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {preparingImage ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <ImagePlus aria-hidden />
          )}
          {image ? "Replace image" : "Add image"}
        </button>

        <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-xs text-danger">
          {error}
        </p>

        {body.length > 0 && <CharacterRing used={body.length} max={MAX_LENGTH} />}

        <button
          type="submit"
          disabled={!canPost}
          className={buttonClasses({ size: "sm", className: "px-4" })}
        >
          {pending ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

/** Fills as you type; turns amber near the limit and shows the count in the last 20. */
function CharacterRing({ used, max }: { used: number; max: number }) {
  const remaining = max - used;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, used / max);
  const color = remaining < 0 ? "var(--danger)" : remaining <= 100 ? "var(--star)" : "var(--ocean)";
  const showCount = remaining <= 20;

  return (
    <span
      role="meter"
      aria-label="Characters used"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={used}
      className="relative grid size-7 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 24 24" className={`size-7 -rotate-90 transition-transform ${showCount ? "scale-110" : ""}`} aria-hidden>
        <circle cx="12" cy="12" r={radius} fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          style={{ stroke: color }}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset,stroke] duration-150"
        />
      </svg>
      {showCount && (
        <span
          className="absolute text-[0.625rem] font-semibold tabular-nums"
          style={{ color }}
        >
          {remaining}
        </span>
      )}
    </span>
  );
}
